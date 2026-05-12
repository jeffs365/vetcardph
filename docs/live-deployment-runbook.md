# VetCard live deployment runbook

This runbook is for the first public `vetcard.ph` deployment. The recommended first launch shape is one Azure App Service running the Fastify backend and serving the built React app from the same origin. Supabase provides managed Postgres.

## Target architecture

- `https://vetcard.ph` -> Azure App Service for the React app and `/api/*`
- Supabase Postgres -> Prisma `DATABASE_URL`
- GitHub private repo -> source control and GitHub Actions deploys
- Azure App Service managed certificate -> HTTPS

This keeps auth cookies same-origin and avoids early `app.vetcard.ph` / `api.vetcard.ph` CORS complexity.

## Current local status

- The VetCard workspace has a local Git repository on `main`, but no GitHub remote yet.
- GitHub CLI is installed but not logged in.
- Azure CLI is installed and logged in to the subscription named `Azure subscription 1`.
- Supabase CLI was not found locally, so create the Supabase project in the Supabase dashboard.

## 1. Create the GitHub repo

Use a private repo for now because the workspace contains business planning docs and operational context.

```bash
gh auth login
git add .
git commit -m "Prepare VetCard for production deployment"
gh repo create vetcard --private --source=. --remote=origin --push
```

Before pushing, confirm `git status --ignored --short` shows local secrets, `tmp/`, `uploads/`, and `leads/` as ignored.

## 2. Create Supabase Postgres

In Supabase:

1. Create a project for VetCard.
2. Choose the nearest suitable region for the first clinic users.
3. Open **Connect** and copy the **Supavisor Session pooler** connection string on port `5432`.
4. Replace the password placeholder and keep the full string for Azure app settings.

Use session pooler mode for Azure App Service because it is a persistent backend and the pooler supports IPv4. Supabase's current Prisma guidance recommends the session pooler string for server-based Prisma deployments unless your environment supports direct IPv6.

Run migrations once the production `DATABASE_URL` is available:

```bash
DATABASE_URL="postgresql://..." npm --workspace @vetcard/backend run db:migrate:deploy
```

Optionally seed demo data only if this is a controlled demo environment:

```bash
DATABASE_URL="postgresql://..." npm --workspace @vetcard/backend run seed
```

## 3. Create Azure hosting

Set names:

```bash
RESOURCE_GROUP=vetcard-prod-rg
LOCATION=southeastasia
PLAN=vetcard-prod-plan
APP=vetcard-ph-prod
```

Create the App Service resources:

```bash
az group create --name "$RESOURCE_GROUP" --location "$LOCATION"
az appservice plan create --name "$PLAN" --resource-group "$RESOURCE_GROUP" --is-linux --sku B1
az webapp create --name "$APP" --resource-group "$RESOURCE_GROUP" --plan "$PLAN" --runtime "NODE:22-lts"
```

Configure runtime and startup:

```bash
az webapp config set \
  --name "$APP" \
  --resource-group "$RESOURCE_GROUP" \
  --startup-file "NODE_PATH=/home/site/wwwroot/app_node_modules node /home/site/wwwroot/backend/dist/index.js"

az webapp config appsettings set \
  --name "$APP" \
  --resource-group "$RESOURCE_GROUP" \
  --settings \
    NODE_ENV=production \
    SERVE_WEB_APP=true \
    HOST=0.0.0.0 \
    PORT=8080 \
    CORS_ORIGIN=https://vetcard.ph,https://www.vetcard.ph \
    COOKIE_SECURE=true \
    ALLOW_CLINIC_REGISTRATION=false \
    OWNER_OTP_DELIVERY_MODE=disabled \
    JWT_SECRET="<generate-32-plus-random-chars>" \
    COOKIE_SECRET="<generate-32-plus-random-chars>" \
    DATABASE_URL="<supabase-session-pooler-url>"
```

Generate secrets locally with:

```bash
openssl rand -base64 48
```

Disable App Service build during deployment. The GitHub workflow builds a Linux x64 runtime package and deploys that package directly. This avoids App Service/Kudu rebuilding native dependencies such as `sharp` on the B1 worker.

```bash
az webapp config appsettings set \
  --name "$APP" \
  --resource-group "$RESOURCE_GROUP" \
  --settings SCM_DO_BUILD_DURING_DEPLOYMENT=false ENABLE_ORYX_BUILD=false SCM_COMMAND_IDLE_TIMEOUT=1800
```

## 4. Connect GitHub Actions to Azure

Use GitHub Actions OIDC instead of a publish-profile secret. Create an Azure app registration,
add a federated credential scoped to the repository branch, and grant it deploy rights to the
App Service:

```bash
az ad app create --display-name vetcard-github-actions-oidc

az ad app federated-credential create \
  --id "<azure-app-object-id>" \
  --parameters ./github-oidc-credential.json

az role assignment create \
  --assignee "<azure-app-client-id>" \
  --role Contributor \
  --scope "/subscriptions/<subscription-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$APP"
```

The workflow at `.github/workflows/azure-app-service.yml` deploys on pushes to `main` and can
also be run manually. It logs into Azure through OIDC and creates a runtime zip with:

- `backend/dist`
- `backend/prisma`
- `web/dist`
- Linux x64 production dependencies in `app_node_modules`

The Azure startup command uses `NODE_PATH=/home/site/wwwroot/app_node_modules` so Node can resolve those dependencies without relying on Kudu's `node_modules` tar/symlink optimization.

## 5. Point `vetcard.ph` to Azure

In Azure, get the custom domain verification ID and outbound IP:

```bash
az webapp show \
  --name "$APP" \
  --resource-group "$RESOURCE_GROUP" \
  --query "{defaultHostName:defaultHostName, customDomainVerificationId:customDomainVerificationId, outboundIpAddresses:outboundIpAddresses}" \
  -o json
```

At the domain registrar/DNS host, add:

- `A` record for `@` pointing to the Azure App Service IP address.
- `TXT` record for `asuid` containing Azure's custom domain verification ID.
- `CNAME` record for `www` pointing to `$APP.azurewebsites.net`.
- `TXT` record for `asuid.www` containing the same verification ID.

Then bind the domains:

```bash
az webapp config hostname add --webapp-name "$APP" --resource-group "$RESOURCE_GROUP" --hostname vetcard.ph
az webapp config hostname add --webapp-name "$APP" --resource-group "$RESOURCE_GROUP" --hostname www.vetcard.ph
```

Add managed certificates and bind TLS in the Azure Portal from **App Service > Custom domains**. Azure currently recommends an `A` record for root/apex domains and a `CNAME` for subdomains such as `www`.

## 6. Smoke test

After deploy and DNS propagation:

```bash
curl -fsS https://vetcard.ph/api/health
curl -I https://vetcard.ph
```

Expected API response:

```json
{"status":"ok"}
```

Then test:

- Staff login and refresh.
- Owner login and refresh.
- Add a pet.
- Add a visit.
- Upload or view an avatar/photo if that flow is part of the demo.
- Public share link opens from a private/incognito browser.

## 7. Known follow-up before broad launch

- Move uploaded files off the App Service filesystem if uploads become important. App Service storage is not the right long-term place for pet photos/documents.
- Add backups and restore testing for Supabase.
- Decide whether `www.vetcard.ph` redirects to `vetcard.ph`.
- Keep the first production repo private until sensitive docs and lead artifacts are separated.
