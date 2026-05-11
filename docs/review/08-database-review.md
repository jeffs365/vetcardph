# Database Review — VetCard (Iteration 2)
> Reviewed 2026-05-04 · Prior review: `01-database-review.md` (2026-05-03)

## Executive Summary

The VetCard database layer has progressed significantly since the prior review. The critical issue — the in-process OTP store — has been resolved with a proper database table and rate-limiting implementation. However, two new operational risks have emerged: the lack of migration history and a potential data integrity gap related to expired share tokens and OTP records that accumulate indefinitely. The schema remains well-modelled, but improvements to cascade-delete rules and index coverage will strengthen production readiness.

---

## Verification of Prior Findings

| # | Issue | Status | Evidence |
|---|-------|--------|----------|
| 1 | In-process OTP store (data loss on restart) | **FIXED** | `backend/prisma/schema.prisma:304–314`. `OwnerOtp` table added with `expiresAt`, `usedAt`, `attempts` fields. `backend/src/lib/owner-otp.ts` now uses DB: `prisma.ownerOtp.create()` at line 35 and `verifyOwnerOtpCode()` queries DB at line 51. Rate limiting implemented via `countRecentAttempts()` (line 16–24). |
| 2 | OTP code returned in API response (`devCode`) | **FIXED** | `backend/src/routes/owner-auth.ts:58` now uses environment gate: `...(env.NODE_ENV === 'development' ? { devCode: otp.code } : {})`. Gate also applied at line 98 in `/register` endpoint. |
| 3 | No OTP rate limiting | **FIXED** | `backend/src/lib/owner-otp.ts:6,16–24`. `MAX_ATTEMPTS_PER_WINDOW = 3` per `RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000`. Checked before code generation (line 29). |
| 4 | PreventiveSchedule unique constraint edge case | **OPEN** | No change. `schema.prisma:267` still constrains `@@unique([clinicId, petId, careTypeId])`. The CareType unique constraint at line 220 includes `defaultIntervalValue` and `defaultIntervalUnit`, so the PreventiveSchedule constraint is still correct but the underlying assumption (that care type intervals are immutable) is not documented. |
| 5 | Denormalised `defaultIntervalDays` | **OPEN** | No change. `schema.prisma:212` still stores `defaultIntervalDays Int`. The `resolveCareType()` helper at `backend/src/routes/preventive-records.ts:79` correctly computes it via `intervalToDays()`. No direct mutations observed, but no comment added to schema to prevent future bugs. |
| 6 | `Appointment.notes` required min(2) mismatch | **PARTIAL** | `schema.prisma:191` still shows `notes String` (required, no default). Zod validation at `backend/src/routes/appointments.ts:14` still requires `min(2)`. However, the `/register` endpoint in `owner-auth.ts:83` creates owners with `address: ''` (empty string), and there is no enforcement preventing empty notes in the database — the validation is only at API layer. The schema should either make `notes` optional or have a default. Not critical but inconsistent. |
| 7 | `Owner.address` required, no owner self-update endpoint | **PARTIAL** | `schema.prisma:108` still requires `address String` (no `?`). BUT, `backend/src/routes/owner-auth.ts:161–179` adds a `PATCH /me` endpoint that allows owners to update address (line 174: `input.address !== undefined ? { address: input.address } : {}`). This resolves the UX gap. However, `owner-auth.ts:83` creates owners with `address: ''` on self-registration — this violates the domain rule that address is required and should be filled at registration time or updated immediately after. |
| 8 | No Prisma migration history | **STILL OPEN** | `/Users/mini/Startup/vetcard/backend/prisma/migrations/` does not exist. The codebase uses `prisma db push` (schema-push mode), not `prisma migrate dev`. No migration files in version control. This blocks safe CI/CD and rollback capability. |
| 9 | `ageLabel` free-text parsing is fragile | **OPEN** | No change. `backend/src/routes/pets.ts:58–80` still uses regex parse with fallback to `null`. Seed data at `backend/prisma/seed.ts:135` uses `ageLabel: '2 yr'`, which matches the regex (unit `yr`), so it works. But no normalization or enum applied. |
| 10 | Audit snapshots stored as untyped strings | **OPEN** | No change. `schema.prisma:280–281` still stores `previousSnapshot String?` and `nextSnapshot String?`. `backend/src/lib/audit.ts:25–26` serializes with `JSON.stringify()` but stores as string. No schema enforcement. |

---

## New Findings

### 1. Expired OTP and ShareToken Records Accumulate Indefinitely

**Severity:** Medium · **File:** `backend/prisma/schema.prisma:304–314, 316–333`

**Problem:**
The `OwnerOtp` table has no cleanup mechanism. Expired and used OTP records remain in the database forever, degrading query performance on the `[mobile, expiresAt]` index over time. Similarly, `ShareToken` records with `revokedAt IS NOT NULL` or `expiresAt <= NOW()` accumulate. There is no job or trigger to clean these up.

For `OwnerOtp`: the query at `backend/src/lib/owner-otp.ts:51` filters `expiresAt: { gt: new Date() }` and `usedAt: null`, so expired/used records are functionally hidden, but they still occupy disk space and index memory.

**Fix sketch:**
- Add a scheduled job to hard-delete records older than 30 days, OR
- Use PostgreSQL `pg_cron` to run `DELETE FROM "OwnerOtp" WHERE "expiresAt" < NOW() - interval '7 days'` daily.

**Short-term:** Document the expected data growth and monitor table size.

---

### 2. Missing Index on ShareToken for Expiry Queries

**Severity:** Low · **File:** `backend/prisma/schema.prisma:316–333`

**Problem:**
`public-share.ts:11` and similar code check `expiresAt.getTime() <= Date.now()` in application logic, not the database. There is no database-level query that uses `expiresAt` in a WHERE clause. If you add a background job to clean expired tokens, you will need an index on `expiresAt`.

**Fix sketch:** Add `@@index([expiresAt])` to `ShareToken` to support future cleanup queries.

---

### 3. PreventiveRecord — `[clinicId, petId, careTypeId, administeredOn]` Composite Index

**Severity:** Low · **File:** `backend/src/routes/preventive-records.ts:91–105`

**Problem:**
`syncCurrentClinicSchedule()` queries for the latest record per `clinicId + petId + careTypeId`:
```ts
const latestRecord = await input.tx.preventiveRecord.findFirst({
  where: { clinicId, petId, careTypeId },
  orderBy: [{ administeredOn: 'desc' }, { createdAt: 'desc' }],
})
```
The schema has `[clinicId, nextDueDate]` and `[petId, administeredOn]`, but not a composite for the `findFirst` pattern above. PostgreSQL will use one and filter the rest in memory.

**Fix sketch:** Add `@@index([clinicId, petId, careTypeId, administeredOn])` to `PreventiveRecord`.

---

### 4. Visit — `[clinicId, petId, visitDate]` Composite Index

**Severity:** Low · **File:** `backend/src/routes/visits.ts:75–87`

**Problem:**
The `/visits` endpoint filters by `clinicId`, optional `petId`, and an optional `visitDate` range:
```ts
where: { clinicId, petId, visitDate: { gte, lte } }
orderBy: [{ visitDate: 'asc' }, { createdAt: 'asc' }]
```
The schema has `[clinicId, visitDate]` and `[petId, visitDate]`, but when both are specified neither is ideal.

**Fix sketch:** Add `@@index([clinicId, petId, visitDate])` to `Visit`.

---

### 5. Staff.isActive Not Indexed

**Severity:** Low · **File:** `schema.prisma:81–102, backend/src/routes/staff.ts:36–40`

**Problem:**
`GET /staff` filters by `clinicId` + optional `isActive: true`. Schema has only `[clinicId]` index. Active-only queries scan the index and filter `isActive` in memory.

**Fix sketch:** Add `@@index([clinicId, isActive])` to `Staff`.

---

### 6. Cascade Delete from Clinic to FeedbackSubmission May Be Overly Aggressive

**Severity:** Low · **File:** `schema.prisma:290–302`

**Problem:**
`FeedbackSubmission` has `onDelete: Cascade` on the `clinic` FK. Deleting a clinic deletes all feedback. Feedback is typically archival — losing it removes the record of user complaints/feature requests for a clinic that just churned.

**Fix sketch:** Either soft-delete clinics (`deletedAt DateTime?`) or change the FK to `onDelete: SetNull` so feedback persists. Pick based on retention policy.

---

### 7. Owner.address Inconsistency Between Schema and Self-Register

**Severity:** Low · **File:** `schema.prisma:108, backend/src/routes/owner-auth.ts:83`

**Problem:**
`Owner.address` is required (`String`) but the self-registration endpoint sets `address: ''`. The schema contract says address is required, but the code stores empty strings — semantic nullability without schema-level nullability.

**Fix sketch:** Either change to `address String?` and treat empty/missing the same way, OR require address during owner self-registration.

---

### 8. ShareToken Index Coverage Is Implicit (Informational)

**Severity:** Very Low · **File:** `schema.prisma:316–333`

`publicToken` has only the `@unique` constraint, which creates an implicit index. Fine for `findUnique` lookups. Noted only because future range queries (e.g., expiry sweeps) need an explicit index — see Finding 2.

---

### 9. AuditEntry Snapshots Should Use Json Type for Queryability

**Severity:** Low · **File:** `schema.prisma:280–281, backend/src/lib/audit.ts:25–27`

**Problem:**
Snapshots are stored as JSON-stringified text. If you ever want to query the audit log by field (e.g., "find all audits where `nextSnapshot.status` changed"), you cannot do so against `String`.

**Fix sketch:** Migrate `previousSnapshot`/`nextSnapshot` to Prisma `Json?`. Update `audit.ts` to pass objects directly. Enables:
```ts
auditEntry.findMany({ where: { nextSnapshot: { path: ['status'], equals: 'COMPLETED' } } })
```

---

## Summary Table — All Issues (Prior + New)

| # | Issue | Category | Severity | Status | Effort |
|---|-------|----------|----------|--------|--------|
| 1 | In-process OTP store | Operational | Critical | **FIXED** | — |
| 2 | OTP code in API response | Security | High | **FIXED** | — |
| 3 | No OTP rate limiting | Security | High | **FIXED** | — |
| 4 | PreventiveSchedule constraint edge case | Data Integrity | Low | OPEN | Low |
| 5 | Denormalised `defaultIntervalDays` | Maintenance | Low | OPEN | Low |
| 6 | `Appointment.notes` min(2) mismatch | Schema | Medium | PARTIAL | Low |
| 7 | `Owner.address` required vs empty-string self-register | Schema | Low | PARTIAL | Low |
| 8 | No Prisma migration history | Operational | **High** | **STILL OPEN** | Low |
| 9 | `ageLabel` free-text parsing | Data Quality | Medium | OPEN | Medium |
| 10 | Audit snapshots as untyped strings | Data Integrity | Low | OPEN | Medium |
| N1 | Expired OTP/ShareToken accumulate | Operational | Medium | NEW | Medium |
| N2 | Missing index on ShareToken.expiresAt | Performance | Low | NEW | Low |
| N3 | PreventiveRecord composite index missing | Performance | Low | NEW | Low |
| N4 | Visit `[clinicId, petId, visitDate]` index missing | Performance | Low | NEW | Low |
| N5 | Staff.isActive not indexed | Performance | Low | NEW | Low |
| N6 | Cascade delete from Clinic to FeedbackSubmission | Data Policy | Low | NEW | Low |
| N7 | Owner.address inconsistency | Schema | Low | NEW | Low |
| N8 | ShareToken index coverage implicit | Informational | Very Low | NEW | Trivial |
| N9 | AuditEntry snapshots should be Json | Data Quality | Low | NEW | Medium |

---

## Recommended Actions (Priority Order)

1. **Implement Prisma migrations** (Issue 8). Add `prisma/migrations/` with a baseline migration capturing the current schema. Switch to `prisma migrate dev` locally and `prisma migrate deploy` in CI. Prerequisite for safe multi-instance deploys.
2. **Clean up expired OTP/ShareToken records** (N1). Scheduled job or `pg_cron`.
3. **Fix Owner.address inconsistency** (Issue 7 / N7). Either make optional or require at registration.
4. **Document PreventiveSchedule uniqueness assumption** (Issue 4). One schema comment.
5. **Add composite indexes** (N3–N5).
6. **Migrate AuditEntry to Json** (Issue 10 / N9).
7. **Normalise or validate ageLabel** (Issue 9).

---

## Production Readiness Snapshot

| Aspect | Status | Notes |
|--------|--------|-------|
| Schema correctness | Good | Domain model is sound. |
| Indexes | Adequate | Hot paths covered; 3–5 composite indexes still needed. |
| Data integrity | Good | Cascades and Restricts mostly right. |
| Migrations | **Missing** | Must switch to `prisma migrate` before multi-instance prod. |
| Audit logging | Good | Comprehensive table; Json type would improve queryability. |
| Cleanup / TTL | Partial | No automatic cleanup of OTP/ShareToken. |
| Security | Good | OTP is DB-backed, rate-limited, gated. |
| Operational | Good w/ improvements | Soft-delete absent but not critical for MVP. |
