# Auth Cookie + Session Migration Plan

## Goal

Move VetCard away from storing JWTs in `localStorage` and toward server-managed sessions with `HttpOnly` cookies. This reduces token theft risk from future XSS and gives us a path to refresh, revoke, and audit sessions.

## Current State

Staff auth:
- `POST /api/auth/login` and `POST /api/auth/register-clinic` return `{ token, user }`.
- The web app stores `token` in `localStorage` under `vetcard.auth.token`.
- API calls send `Authorization: Bearer <token>`.
- `requireAuth()` uses `request.jwtVerify()` against the bearer token.

Owner auth:
- `POST /api/owner-auth/verify-code` returns `{ token, user }`.
- The web app stores `token` in `localStorage` under `vetcard.owner.auth.token`.
- Owner API calls send `Authorization: Bearer <token>`.
- `requireOwnerSession()` verifies the bearer JWT.

Important behavior to preserve:
- Staff and owner sessions can coexist in the same browser.
- The local dev flow returns owner OTP `devCode` only in development.
- Staff and owner logout should not log out the other portal.

## Target Shape

Use separate cookie/session lanes:

- Staff access cookie: `vc_staff_access`
- Staff refresh/session cookie: `vc_staff_refresh`
- Owner access cookie: `vc_owner_access`
- Owner refresh/session cookie: `vc_owner_refresh`

Access cookies:
- `HttpOnly`
- `Secure` in production
- `SameSite=Lax` initially, consider `Strict` if cross-site flows are never needed
- Short lifetime, e.g. 15 minutes
- JWT payload can stay close to today’s `SessionUser` / `OwnerSessionUser`

Refresh cookies:
- `HttpOnly`
- `Secure` in production
- `SameSite=Lax`
- Longer lifetime, e.g. 30 days
- Opaque random token, stored hashed in DB
- Rotation on refresh

The API should accept cookie auth first, then bearer token during a transition window. After the web app is fully migrated and tests pass, remove bearer support and localStorage token persistence.

## Database Change

Add a session table through Prisma Migrate:

```prisma
enum AuthSessionKind {
  STAFF
  OWNER
}

model AuthSession {
  id               String          @id @default(cuid())
  kind             AuthSessionKind
  staffId          String?
  ownerId          String?
  refreshTokenHash String          @unique
  userAgent        String?
  ipAddress        String?
  expiresAt        DateTime
  revokedAt        DateTime?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  staff Staff? @relation(fields: [staffId], references: [id], onDelete: Cascade)
  owner Owner? @relation(fields: [ownerId], references: [id], onDelete: Cascade)

  @@index([kind, staffId, expiresAt])
  @@index([kind, ownerId, expiresAt])
  @@index([expiresAt])
}
```

Validation rule in code:
- `STAFF` sessions must have `staffId` and no `ownerId`.
- `OWNER` sessions must have `ownerId` and no `staffId`.

## Backend Implementation Steps

1. Add cookie support.
   - Install/register `@fastify/cookie`.
   - Add env values:
     - `COOKIE_SECRET`
     - `COOKIE_SECURE`
     - `AUTH_ACCESS_TOKEN_MINUTES`
     - `AUTH_REFRESH_TOKEN_DAYS`

2. Add session helpers.
   - `createStaffSession(staff, clinic, request, reply)`
   - `createOwnerSession(owner, request, reply)`
   - `rotateStaffSession(request, reply)`
   - `rotateOwnerSession(request, reply)`
   - `clearStaffCookies(reply)`
   - `clearOwnerCookies(reply)`
   - Hash refresh tokens before DB storage.

3. Update login/register/OTP verify.
   - Staff login and clinic register set staff cookies and return `{ user }`.
   - Owner OTP verify sets owner cookies and return `{ user }`.
   - During transition, returning `token` is allowed but should be marked deprecated in comments/tests.

4. Add refresh endpoints.
   - `POST /api/auth/refresh`
   - `POST /api/owner-auth/refresh`
   - Each validates refresh cookie, rotates DB token, sets fresh cookies, and returns `{ user }`.

5. Add logout endpoints.
   - `POST /api/auth/logout`
   - `POST /api/owner-auth/logout`
   - Revoke the current refresh session and clear only that lane’s cookies.

6. Update auth guards.
   - `requireAuth()` should read `vc_staff_access` first.
   - `requireOwnerSession()` should read `vc_owner_access` first.
   - Keep `Authorization` bearer fallback until the frontend has migrated.

7. Add CSRF posture.
   - With `SameSite=Lax` and same-site app deployment, risk is much lower, but cookie auth means state-changing requests become ambient.
   - Before public production, add a CSRF double-submit token for unsafe methods (`POST`, `PUT`, `PATCH`, `DELETE`) or tighten to `SameSite=Strict` if product flows allow it.

## Frontend Implementation Steps

1. Update `apiRequest`.
   - Add `credentials: "include"` on every fetch.
   - Keep `Authorization` optional during transition.
   - On `401`, optionally call the matching refresh endpoint once, then retry the request.

2. Update staff auth provider.
   - Remove token as the primary auth state.
   - On load, call `/auth/me` with cookies.
   - `signIn()` and `registerClinic()` should persist only `user`, not a token.
   - `signOut()` should call `/auth/logout`, then clear local user state.

3. Update owner auth provider.
   - Same pattern using `/owner-auth/me`, `/owner-auth/refresh`, `/owner-auth/logout`.
   - Keep owner and staff auth states independent.

4. Transitional cleanup.
   - On successful cookie login, remove old localStorage keys:
     - `vetcard.auth.token`
     - `vetcard.owner.auth.token`
   - After migration is stable, delete token fields from auth contexts and tests.

## Testing Plan

Backend:
- Staff login sets staff cookies.
- Owner OTP verify sets owner cookies.
- Staff cookie cannot access owner routes.
- Owner cookie cannot access staff routes.
- Refresh rotates refresh token and revokes the old one.
- Logout revokes session and clears only the matching cookies.
- Bearer fallback still works during transition.

Frontend:
- Staff reload keeps session through cookies.
- Owner reload keeps session through cookies.
- Staff logout does not clear owner session.
- Owner logout does not clear staff session.
- 401 refresh retry works once and avoids infinite loops.
- Existing protected route redirects still work.

Manual browser QA:
- Log in as clinic staff, reload `/home`.
- Open owner login, log in as pet owner, reload `/owner/home`.
- Switch between `/home` and `/owner/home`; both should remain signed in.
- Staff logout should leave owner portal signed in.
- Owner logout should leave staff portal signed in.

## Rollout Plan

Phase 1: Backend cookie/session support with bearer fallback. Completed 2026-05-04.

Phase 2: Frontend uses cookies, still tolerates old localStorage tokens. Completed 2026-05-04.

Phase 3: Remove localStorage token writes and bearer headers. Completed 2026-05-04.

Phase 4: Remove backend bearer fallback and add CSRF protection before public production. Completed 2026-05-04.

## Open Decisions

- `SameSite=Lax` vs `Strict`.
  - Recommendation: start with `Lax` for smoother navigation; revisit before production.

- Refresh session length.
  - Recommendation: 30 days for staff and owner; shorter if clinic devices are shared.

- Session management UI.
  - Defer. Later, add “sign out all devices” for staff owners and pet owners.

- CSRF implementation.
  - Recommendation: add double-submit CSRF before removing bearer fallback in a public deployment.
