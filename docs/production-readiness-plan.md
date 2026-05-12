# VetCard Production Readiness Plan

This is the checklist for moving VetCard from public demo to a real production pilot.

## Current Production Status

- `vetcard.ph` and `www.vetcard.ph` are live on Azure App Service.
- GitHub Actions deploys `main` to Azure through OIDC.
- Azure runs with `NODE_ENV=production`, secure cookies, HTTPS-only, and restricted CORS.
- Prisma migrations exist and deploy through the production runbook.
- Owner OTP no longer returns a development code in production.

## Must-Have Before Real Clinic Use

1. Add real OTP delivery.
   - Choose an SMS provider that works reliably for Philippine mobile numbers.
   - Wire provider credentials into Azure app settings.
   - Change `OWNER_OTP_DELIVERY_MODE` from `disabled` to the real delivery mode after implementation.
   - Keep `dev-response` limited to local development only.

2. Keep public clinic registration closed.
   - Production defaults `ALLOW_CLINIC_REGISTRATION=false`.
   - Create clinic accounts manually for approved pilot clinics.
   - Re-open self-registration only after onboarding, abuse control, and review flows are ready.

3. Remove or isolate demo data.
   - Do not run `npm --workspace @vetcard/backend run seed` against production.
   - If existing demo records are in the production database, archive or delete them before inviting real clinics.
   - Keep screenshots, demo credentials, and sample records out of public-facing production flows.

4. Backups and restore drill.
   - Confirm Supabase automated backups are enabled for the selected plan.
   - Run at least one restore test into a separate database before real clinic onboarding.
   - Document the restore owner and expected recovery time.

5. Monitoring and incident basics.
   - Enable Azure log retention beyond the temporary deployment default.
   - Add uptime checks for `/api/health`.
   - Decide who receives alerts for downtime, failed deploys, and database errors.

6. Security verification.
   - Confirm no default local secrets are active in Azure.
   - Keep GitHub deploy auth on OIDC, not publish-profile secrets.
   - Review public share links, owner access, clinic tenant isolation, and staff roles before broader rollout.

## Current Safety Defaults

- Production owner OTP requests return a clear unavailable message until real SMS delivery exists.
- Production clinic registration is invite-only unless explicitly enabled.
- Local development still supports `OWNER_OTP_DELIVERY_MODE=dev-response` for fast testing.

## Pilot Launch Recommendation

Use production first for a controlled pilot with one to three clinics, not open public signup. The first production goal is reliable real clinic record entry, owner lookup/share, and operational feedback. Broad owner self-service should wait until SMS delivery, support process, and cleanup/backup routines are proven.
