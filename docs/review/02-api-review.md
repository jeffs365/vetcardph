# API Review — VetCard
> Iteration 2 of 3 · Reviewed 2026-05-03

## Executive Summary

The Fastify + Prisma + Zod stack is clean and consistent. Route handlers follow a clear pattern, transactions are used correctly, and tenant isolation (every query scopes to `clinicId`) is applied throughout the clinic-side API. The main concerns are: the missing `GET /visits/:visitId` endpoint, the age-filter N+1 problem in pet search, several missing DELETE endpoints, and unauthenticated exposure of the OTP code.

---

## Architecture Overview

```
POST /api/auth/register-clinic        → Creates clinic + OWNER staff + default care types
POST /api/auth/login                  → JWT (HS256), payload contains staffId + clinicId + role
GET  /api/auth/me                     → Re-validates session, refreshes JWT payload
PATCH /api/auth/me                    → Update own profile
PATCH /api/auth/clinic                → Update clinic info (OWNER only)
POST /api/auth/change-password        → Change own password

POST /api/owner-auth/request-code     → Issues OTP (in-process store)
POST /api/owner-auth/verify-code      → Validates OTP, issues owner JWT
GET  /api/owner-auth/me               → Owner session refresh

GET  /api/pets                        → List pets for clinic (search + filters)
POST /api/pets                        → Create pet + owner (upserts owner by mobile)
GET  /api/pets/link-candidates        → Find owner's pets by mobile for linking
POST /api/pets/:petId/link            → Link existing pet to current clinic
GET  /api/pets/:petId                 → Full pet profile with visits, appts, records
PUT  /api/pets/:petId                 → Update pet

GET  /api/visits                      → List visits (by date range or petId)
POST /api/pets/:petId/visits          → Create visit
PUT  /api/visits/:visitId             → Update visit

GET  /api/appointments                → List appointments
GET  /api/appointments/summary        → Today/due/upcoming counts
GET  /api/appointments/:appointmentId → Single appointment
POST /api/appointments                → Create appointment
PUT  /api/appointments/:appointmentId → Update appointment
PATCH /api/appointments/:appointmentId/status → Update status
DELETE /api/appointments/:appointmentId → Delete appointment

GET  /api/pets/:petId/preventive-records → Pet preventive history
POST /api/pets/:petId/preventive-records → Record care item
PUT  /api/preventive-records/:recordId   → Update care record
GET  /api/due-records                    → Due/overdue schedule items

GET  /api/staff                       → List active staff
POST /api/staff                       → Create staff (OWNER only)
POST /api/staff/:staffId/reset-password → Reset staff password (OWNER only)

GET  /api/care-types                  → List care types for clinic
GET  /api/dashboard/summary           → Dashboard aggregates

POST /api/owner/pets                  → Owner creates pet (owner portal)
GET  /api/owner/pets                  → Owner lists own pets
GET  /api/owner/pets/:petId           → Owner pet detail
GET  /api/owner/share                 → Owner's share tokens
POST /api/owner/share                 → Create share token
PATCH /api/owner/share/:tokenId/revoke → Revoke share token
GET  /api/share/:publicToken          → Public share view (unauthenticated)

POST /api/feedback                    → Submit feedback
GET  /api/feedback                    → Get feedback (OWNER only)
```

---

## What Works Well

### Consistent Auth Pattern
Every protected handler calls `requireAuth` / `requireOwnerSession` first and returns early on failure. The pattern is simple and easy to audit. No route accidentally skips auth.

### Tenant Isolation
Every Prisma query on the clinic-side API filters by `clinicId: request.user.clinicId`. Cross-clinic data access is not possible through normal API usage. The `ClinicPetAccess` check on pet reads (`clinicAccesses: { some: { clinicId } }`) ensures a clinic can only see pets it has been granted access to.

### Zod Validation
Input validation with Zod is applied to all body, query, and param inputs. The global error handler catches `ZodError` and returns structured 400 responses with field-level issues — this is the right approach.

### Transaction Usage
Create/update operations that touch multiple tables (clinic + staff on register, visit + appointment status on visit creation, preventive record + schedule sync) are all wrapped in `prisma.$transaction`. This prevents partial writes.

### Preventive Schedule Sync Logic
The `syncCurrentClinicSchedule` function correctly maintains the materialised schedule state. Recording a preventive item elsewhere (`COMPLETED_ELSEWHERE`) correctly propagates to other clinics' open schedules for the same pet. This is the trickiest piece of business logic and it is done right.

---

## Issues & Recommendations

### 1. No `GET /visits/:visitId` Endpoint — Missing
**Problem:** The `PUT /visits/:visitId` endpoint exists (update), but there is no `GET /visits/:visitId`. The `AddVisit` edit form on the frontend fetches visit data by loading the full pet profile (`/pets/:petId`) and finding the visit within it. This means to edit a visit, the client must load the entire pet profile (including all appointments and preventive records) just to get the one visit's data.

This is inefficient and forces the client into a tight coupling between the visit edit form and the pet detail query.

**Fix:**
```ts
app.get('/visits/:visitId', async (request, reply) => {
  const isAuthenticated = await requireAuth(request, reply)
  if (!isAuthenticated) return

  const params = z.object({ visitId: z.string().min(1) }).parse(request.params)
  const visit = await prisma.visit.findFirst({
    where: { id: params.visitId, clinicId: request.user.clinicId },
    include: { attendedBy: { select: { id: true, fullName: true, role: true } } },
  })

  if (!visit) return reply.code(404).send({ message: 'Visit not found.' })
  return { visit }
})
```

### 2. Pet Age Filter Is an Application-Level Filter (N+1 Risk)
**File:** `backend/src/routes/pets.ts` lines 192–267

```ts
take: query.age ? 250 : query.q ? 100 : 200,
// ...
const filteredPets = query.age ? pets.filter(...getAgeBucket...) : pets
```

When `?age=` is provided, the API fetches up to 250 pets from the database and then filters them in JavaScript. This means:
1. As pet counts grow, you will fetch 250 pets but return only a handful.
2. The `birthDate`/`ageLabel` parsing logic (`getAgeInMonthsFromLabel`) runs in Node for each record.
3. Pagination is broken for the age filter — you cannot page through results correctly if the filter happens after the `take`.

**Better approach:** Add a computed `ageMonths` column to the Pet table (nullable Int), populate it on create/update, and filter by range in SQL. This turns an O(n) application filter into an indexed SQL range query.

Short-term: at minimum, increase the `take` limit or remove it entirely when an age filter is applied, and document the limitation.

### 3. `GET /appointments/summary` Route Order Conflict
**File:** `backend/src/routes/appointments.ts`

The routes are registered in this order:
1. `GET /appointments/:appointmentId`
2. `GET /appointments`
3. `GET /appointments/summary`

In Fastify, routes are matched in registration order. When a request comes in for `/appointments/summary`, Fastify will match `:appointmentId = "summary"` before it reaches the `GET /appointments/summary` handler — **but** Fastify uses a radix tree router (find-my-way) which actually handles this correctly by preferring static segments over params.

However, this is fragile and easy to get wrong if routes are reordered. **Recommendation:** Register `GET /appointments/summary` before `GET /appointments/:appointmentId` to make the intent explicit and remove the reliance on router internals.

### 4. No `DELETE /visits/:visitId` or `DELETE /preventive-records/:recordId`
The appointments route has a DELETE handler. Visits and preventive records do not. If a staff member makes a data entry error, there is no way to remove the record — only edit it.

For an MVP this may be intentional (medical records should not be deleted lightly), but the omission should be deliberate. If soft-delete is the intent, add an `isDeleted Boolean @default(false)` flag and filter it out of all queries. Document this decision.

### 5. `POST /pets` — Owner Data Is Silently Updated on Duplicate Mobile
**File:** `backend/src/routes/pets.ts` lines 344–357

```ts
const owner = await tx.owner.upsert({
  where: { mobile: normalizedOwnerMobile },
  update: {
    fullName: input.ownerName,      // ← overwrites existing name
    address: input.ownerAddress,    // ← overwrites existing address
    email: input.ownerEmail || null,
  },
  ...
})
```

If clinic A registered "Maria Santos" at "123 Main St", and clinic B registers a pet for the same mobile number with the name "Maria Santos-Cruz" and a different address, the owner record is silently overwritten. This could corrupt data for clinic A.

**Recommended approach:** Only update the owner fields if the owner record belongs to this clinic (i.e., the owner has pets linked to this clinic) or if `claimedAt` is null (owner has not self-claimed). Otherwise, treat it as a read-only reference.

### 6. `PUT /appointments/:appointmentId` Allows Changing the Pet
**File:** `backend/src/routes/appointments.ts` lines 271–334

The appointment update handler accepts a `petId` in the body and validates that the new pet is accessible by the clinic. This means an appointment originally booked for "Max" can be changed to "Bella". This is probably intentional, but it is a significant change that is not audited clearly (the audit summary just says "Appointment updated for [new pet name]"). The previous pet is not mentioned.

**Fix:** Either disallow changing the pet on update (remove `petId` from the update schema) or add an explicit audit note when the pet changes.

### 7. `PATCH /appointments/:appointmentId/status` Does Not Validate Transitions
Any status can be set to any other status. This allows logically invalid transitions like `COMPLETED → SCHEDULED` (re-opening a completed appointment) or `CANCELLED → COMPLETED`. 

For MVP this is probably fine (staff need flexibility), but add at minimum a guard against `COMPLETED → SCHEDULED` since a completed appointment has a linked visit record, and re-opening it would produce inconsistent state.

### 8. `GET /pets` Has No Pagination — Cursor Recommended
**File:** `backend/src/routes/pets.ts`

The `take` cap (200 for unfiltered, 100 for search) is a hard limit but not exposed as pagination. Clinics with >200 pets will silently get a truncated list. The `orderBy: [{ updatedAt: 'desc' }]` means the most recently updated pets appear first, which is a reasonable default, but pets older than the 200th update are invisible.

**Fix:** Add cursor-based pagination (`cursor`, `take` query params). For MVP, at minimum expose the total count so the client can show "showing 200 of 347 pets."

### 9. `POST /api/staff` Does Not Validate `password` Is Not the Same as Email
Minor: it is possible to create a staff account where `password === email`. Add a refinement if this is a concern.

### 10. `GET /due-records` Hardcodes 7-Day Window — Should Be Configurable
**File:** `backend/src/routes/preventive-records.ts` line 374

```ts
const dueSoonLimit = addInterval(today, 7, 'DAY')
```

The 7-day "due soon" window is hardcoded. The dashboard uses the same 7-day window. This matches the current UI but should either be a named constant (`DUE_SOON_DAYS = 7`) or a query parameter so different views can use different windows. Currently the dashboard and the due-records endpoint must be kept in sync manually.

### 11. No `Content-Security-Policy` or Security Headers
Fastify does not add security headers by default. There is no `@fastify/helmet` or equivalent. The server returns `Content-Type: application/json` but no CSP, X-Frame-Options, or HSTS headers.

**Fix:** Add `@fastify/helmet` with appropriate configuration, especially since the server also serves static files (`/uploads/`).

### 12. JWT Secret Is Not Rotatable
The JWT is signed with a static `JWT_SECRET` env var. There is no refresh token, no token revocation, and no token expiry enforcement visible in the code (Fastify's `@fastify/jwt` does not enforce `exp` by default unless configured).

**Fix:**
```ts
app.register(jwt, {
  secret: env.JWT_SECRET,
  sign: { expiresIn: '7d' },
})
```
Add `expiresIn` to the sign options so tokens eventually expire. For production, add a refresh token flow.

---

## Missing Endpoints Summary

| Missing | Impact |
|---------|--------|
| `GET /visits/:visitId` | AddVisit edit form loads full pet profile to find one visit |
| `DELETE /visits/:visitId` | No way to remove a bad visit entry |
| `DELETE /preventive-records/:recordId` | No way to remove a bad care entry |
| `GET /staff/:staffId` | No way to view a specific staff member's details |
| `DELETE /staff/:staffId` | Staff can be deactivated (`isActive=false`) but there is no endpoint for it |
| `PATCH /owner/me` | Owners cannot update their own name/email/address |

---

## Summary Table

| # | Issue | Severity | Effort |
|---|-------|----------|--------|
| 1 | No `GET /visits/:visitId` | **High** | Low |
| 2 | Age filter is application-level (N+1, broken pagination) | **High** | Medium |
| 3 | Route order conflict on `/appointments/summary` | Medium | Low |
| 4 | No DELETE for visits or preventive records | Medium | Low |
| 5 | Owner data silently overwritten on duplicate mobile | **High** | Medium |
| 6 | Appointment update allows changing the pet without audit | Medium | Low |
| 7 | No status transition validation for appointments | Low | Low |
| 8 | No pagination on `GET /pets` | Medium | Medium |
| 9 | Password == email allowed | Low | Low |
| 10 | 7-day window hardcoded in two places | Low | Low |
| 11 | No security headers | **High** | Low |
| 12 | JWT has no expiry configured | **High** | Low |

**Priority for tomorrow:** Issues 1, 5, 11, and 12 are the most impactful. Issues 2 and 8 become urgent once you have >200 pets per clinic.
