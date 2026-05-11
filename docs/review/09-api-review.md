# API Review — VetCard (Iteration 3)
> Reviewed 2026-05-04 · Prior review: `02-api-review.md` (2026-05-03)

## Executive Summary

The Fastify + Prisma + Zod backend is well-structured with consistent patterns, proper transaction usage, and comprehensive tenant isolation. Since the prior review, the missing `DELETE /visits/:visitId` and `DELETE /preventive-records/:recordId` endpoints have been implemented, security headers (`@fastify/helmet`) are now wired up, and JWTs have a 30-day expiry.

The primary new concerns are: (1) a tenant isolation gap in `GET /pets/:petId/preventive-records` missing `clinicId` scoping, (2) `PATCH /appointments/:appointmentId/status` accepting invalid state transitions including `COMPLETED → SCHEDULED`, (3) missing role-based access control on several appointment endpoints letting any authenticated staff member modify them, and (4) missing brute-force protection on staff login (owner-side has rate limiting; staff side does not).

---

## Verification of Prior Findings

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | No `GET /visits/:visitId` | **FIXED** | `backend/src/routes/visits.ts:21–46` — endpoint exists, scoped by `clinicId`. |
| 2 | Age filter is application-level (N+1, broken pagination) | **STILL OPEN** | `backend/src/routes/pets.ts:264,267` — still filters in JS after fetching 250. |
| 3 | Route order conflict on `/appointments/summary` | **STILL OPEN** | `appointments.ts:30,73,135` — order is fine in current file; Fastify's radix tree handles it, but the original concern (fragility on reorder) remains. |
| 4a | No `DELETE /visits/:visitId` | **FIXED** | `visits.ts:295–327` — implemented with audit + transaction. |
| 4b | No `DELETE /preventive-records/:recordId` | **FIXED** | `preventive-records.ts:361–403` — implemented with schedule sync + audit. |
| 5 | Owner data silently overwritten on duplicate mobile | **PARTIAL** | `pets.ts:370–380` — now checks `claimedAt !== null` to skip update, but unclaimed owners can still be overwritten by any clinic. See New Finding 7. |
| 6 | Appointment update allows changing pet without audit | **PARTIAL** | `appointments.ts:329,342` — pet change is now audited, but the audit summary still names only the new pet, not the previous one. |
| 7 | No status transition validation for appointments | **STILL OPEN** | `appointments.ts:353–394` — `PATCH /status` accepts any transition including `COMPLETED → SCHEDULED`. See New Finding 3. |
| 8 | No pagination on `GET /pets` | **STILL OPEN** | `pets.ts:264` — hard limit (200/100), no cursor, no total count. |
| 9 | Password == email allowed | **STILL OPEN** | `staff.ts:15–20` — no refinement. |
| 10 | 7-day window hardcoded in two places | **STILL OPEN** | `preventive-records.ts:418` and `dashboard.ts:16` — both hardcode 7. |
| 11 | No security headers | **FIXED** | `server.ts:36–38` — `@fastify/helmet` registered. |
| 12 | JWT has no expiry | **FIXED** | `server.ts:46` — `expiresIn: '30d'`. (Refresh tokens still absent.) |

### Missing Endpoints — Updated Status

| Missing | Status |
|---------|--------|
| `GET /visits/:visitId` | ✅ Added |
| `DELETE /visits/:visitId` | ✅ Added |
| `DELETE /preventive-records/:recordId` | ✅ Added |
| `GET /staff/:staffId` | Still missing |
| `DELETE /staff/:staffId` (or deactivation) | Partial — `PATCH /staff/:staffId` (line ~153) supports `isActive=false` |
| `PATCH /owner/me` | ✅ Exists — `owner-auth.ts:161` |

---

## New Findings

### 1. Tenant Isolation Gap — `GET /pets/:petId/preventive-records` Missing clinicId Filter

**Severity:** HIGH · **File:** `backend/src/routes/preventive-records.ts:168–179`

**Problem:**
The endpoint verifies the pet is accessible to the clinic (lines 153–162) but then fetches all preventive records for the pet without filtering by `clinicId`:
```ts
const records = await prisma.preventiveRecord.findMany({
  where: { petId: pet.id }, // ← no clinicId
  ...
})
```
If a pet is linked to multiple clinics, clinic A will see records created by clinic B. The `PreventiveRecord` model includes `clinicId` (schema line 226), so this should be scoped. The "shared records" model is intentional for some flows (e.g., `COMPLETED_ELSEWHERE` propagation), but the read endpoint should at minimum return a `recordedHere`-style flag and ideally scope by clinic for owner-clinic privacy.

**Fix:**
```ts
where: { petId: pet.id, clinicId: request.user.clinicId }
```
Or, if cross-clinic visibility is intentional, add a flag in the response identifying which clinic recorded each entry, and document the design.

---

### 2. Missing Role-Based Access Control on Appointment Endpoints

**Severity:** MEDIUM · **File:** `backend/src/routes/appointments.ts:221, 279, 353`

**Problem:**
`POST /appointments`, `PUT /appointments/:appointmentId`, and `PATCH /appointments/:appointmentId/status` use only `requireAuth`. Any authenticated staff member (VET, ASSISTANT, RECEPTIONIST) can modify appointments. Compare with staff creation and clinic updates, which require OWNER. Either decide the policy or document why all roles can edit.

**Fix:** Add an explicit role check (e.g., `OWNER | RECEPTIONIST | VET`) and return 403 otherwise — or document this as intentional in the route comment.

---

### 3. Invalid Appointment Status Transitions Allowed

**Severity:** MEDIUM · **File:** `backend/src/routes/appointments.ts:353–394`

**Problem:**
`PATCH /appointments/:appointmentId/status` accepts any status transition. Illogical changes are possible:
- `COMPLETED → SCHEDULED` (re-opens a completed appointment that has a linked visit row — `Visit.appointmentId` is `@unique`, so the linked Visit becomes orphaned semantically)
- `COMPLETED → CANCELLED`
- `MISSED → COMPLETED` without a visit

**Fix:** Add an explicit transition map and reject invalid transitions with 400:
```ts
const allowed: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ['COMPLETED', 'CANCELLED', 'MISSED'],
  COMPLETED: [],            // terminal
  CANCELLED: ['SCHEDULED'], // allow re-open if no visit
  MISSED:    ['SCHEDULED'],
}
```

---

### 4. Owner Update Overly Permissive on `POST /pets`

**Severity:** MEDIUM · **File:** `backend/src/routes/pets.ts:370–380`

**Problem (revisited from prior #5):**
The fix added `claimedAt !== null` to skip overwriting. But unclaimed owners (most owners — claim happens via OTP verify, which many never do) are still silently overwritten by any clinic registering them with a different name/address.

**Fix:** Only update an unclaimed owner if they are already linked to the current clinic via `ClinicPetAccess`. Otherwise treat the existing owner as read-only and either reject or flow into a "link existing pet" UX.

---

### 5. Missing Brute-Force Protection on Staff Login

**Severity:** MEDIUM · **File:** `backend/src/routes/auth.ts:112–133`

**Problem:**
`POST /auth/login` does not rate-limit failed attempts. The owner-side OTP request endpoint has rate limiting (3 / 15 min), but staff login (which carries higher privilege) does not.

**Fix:** Add IP+email-based rate limiting via `@fastify/rate-limit`, or track a `LoginAttempt` table with a 5-attempt / 15-minute window.

---

### 6. Avatar Path Validation Is Weak

**Severity:** LOW · **File:** `backend/src/routes/pets.ts:110`

```ts
avatarUrl: z.string().trim().startsWith('/uploads/pets/avatar/').max(255).optional().or(z.literal(''))
```
The check enforces a prefix but doesn't validate the filename is one this clinic actually uploaded. A clinic could reference another clinic's uploaded avatar by guessing/observing filenames. Filesystem traversal is prevented since serving comes from a fixed directory, but cross-clinic avatar reuse is not.

**Fix:** Track uploaded filenames in DB (e.g., `PetAsset` table keyed by clinic) and validate against them; or store avatars in a per-clinic subdirectory and validate the prefix matches the requesting clinic.

---

### 7. Missing Rate Limiting on Appointment Creation

**Severity:** LOW · **File:** `backend/src/routes/appointments.ts:221–277`

**Problem:** No rate limit on `POST /appointments`. Less critical than login brute-force but worth noting if abuse becomes a concern.

---

### 8. Audit Snapshots Log Untrimmed Strings

**Severity:** LOW · **File:** `backend/src/routes/feedback.ts:73–76`

Feedback message fields up to 2000 chars are stored verbatim in audit snapshots. Audit logs grow unbounded. Truncate large fields or omit them from snapshots.

---

### 9. Pet Change in Appointment Update — Audit Summary Hides Old Pet

**Severity:** LOW · **File:** `backend/src/routes/appointments.ts:329–342`

The audit captures previous and next snapshots, but the human-readable summary still mentions only the new pet name. When reading the audit log without expanding snapshots, you can't tell what the appointment used to be for.

**Fix:** When `petId` changes, set summary to: `"Appointment moved from {oldPetName} to {newPetName}"`.

---

### 10. Appointment List Query Includes Full Pet/Owner Payload

**Severity:** LOW · **File:** `backend/src/routes/appointments.ts:162–208`

The list endpoint includes the full pet (with owner) on every appointment record. Reasonable for a detail view, wasteful for the list. As appointment counts grow, this materially increases response size and join cost.

**Fix:** For the list endpoint, return only `pet: { id, name, species }` and lazy-load the rest on detail.

---

### 11. Error Handler Logs Raw Errors

**Severity:** VERY LOW · **File:** `backend/src/server.ts:101`

The HTTP response is safely generic, but server logs include the full error object, which can include request bodies/PII. Confirm logs are not shipped to a user-accessible target and consider using a redacted log serializer.

---

### 12. Refresh Tokens Still Absent

**Severity:** LOW · **File:** `backend/src/server.ts:46`

JWTs now expire at 30 days, but there is no refresh flow. After 30 days the user is silently logged out at next request. For a PWA used daily, this is fine; for less-frequent users it could be jarring. Consider a refresh-token endpoint or sliding expiry on `GET /auth/me`.

---

## Final Summary Table

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| Prev 1 | No `GET /visits/:visitId` | High | ✅ FIXED |
| Prev 2 | Age filter N+1 / pagination | High | OPEN |
| Prev 3 | Route order conflict | Medium | OPEN |
| Prev 4 | No DELETE for visits/preventive | Medium | ✅ FIXED |
| Prev 5 | Owner data overwrite | High | PARTIAL |
| Prev 6 | Pet change in appointment update audit | Medium | PARTIAL |
| Prev 7 | Status transition validation | Low | OPEN |
| Prev 8 | No pagination on pets | Medium | OPEN |
| Prev 9 | Password == email | Low | OPEN |
| Prev 10 | 7-day window hardcoded | Low | OPEN |
| Prev 11 | No security headers | High | ✅ FIXED |
| Prev 12 | JWT no expiry | High | ✅ FIXED |
| N1 | Preventive records missing clinicId scope | **High** | NEW |
| N2 | RBAC missing on appointment endpoints | Medium | NEW |
| N3 | Invalid status transitions allowed | Medium | NEW |
| N4 | Owner update permissive on unclaimed | Medium | NEW |
| N5 | No brute-force protection on staff login | Medium | NEW |
| N6 | Avatar path validation weak (cross-clinic) | Low | NEW |
| N7 | No rate limit on appointment creation | Low | NEW |
| N8 | Audit snapshots log full feedback messages | Low | NEW |
| N9 | Audit summary hides old pet on pet swap | Low | NEW |
| N10 | Appointment list includes full pet payload | Low | NEW |
| N11 | Error logs may include PII | Very Low | NEW |
| N12 | No JWT refresh tokens | Low | NEW |

---

## Priority Order for Next Sprint

**Critical (do first):**
1. **N1 — Add `clinicId` to preventive-records GET** (or document the cross-clinic intent and add a `recordedHere` flag).
2. **N5 — Rate-limit staff login.**
3. **Prev 5 / N4 — Tighten owner update guard for unclaimed owners.**

**High:**
4. N2 — Decide and enforce role policy on appointment endpoints.
5. N3 — Add appointment status transition validation.
6. Prev 2 — Move pet age filtering into SQL (add `ageMonths` column).
7. Prev 8 — Cursor pagination on `GET /pets`.

**Medium / Low:**
8. N6, N7, N8, N9, N10 — opportunistic cleanup.
9. Prev 6, Prev 9, Prev 10, N11, N12 — backlog.
