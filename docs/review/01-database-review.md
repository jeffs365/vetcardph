# Database Review — VetCard
> Iteration 1 of 3 · Reviewed 2026-05-03

## Executive Summary

The Prisma schema is well-structured for an MVP. The data model reflects the business domain clearly (clinics, staff, owners, pets, visits, appointments, preventive care, sharing). Indexes are sensible. The main risks are: the in-process OTP store (data loss on restart), missing database-level migrations history, and a few modelling gaps that will cause problems at scale.

---

## What Works Well

### Domain Modelling
- The `ClinicPetAccess` junction table is the right approach for the "shared pet record across clinics" concept. It cleanly separates ownership from access.
- `PreventiveSchedule` as a materialised next-due state (separate from the raw `PreventiveRecord` history) is smart — it avoids expensive aggregation queries on the dashboard and `due-records` endpoint.
- `ShareToken` with both `EMERGENCY` and `FULL_PROFILE` types and explicit revocation/expiry fields is solid groundwork for the QR-code sharing feature.
- `AuditEntry` with `previousSnapshot`/`nextSnapshot` stored as JSON strings is pragmatic for an MVP and gives you a full change log.

### Indexes
All hot query paths are covered:
- `Visit(clinicId, visitDate)` and `Visit(petId, visitDate)` support calendar and profile queries.
- `Appointment(clinicId, status, scheduledFor)` supports the dashboard's appointment summary count.
- `PreventiveSchedule(clinicId, status, nextDueDate)` is the critical index for the dashboard overdue/due-soon counts and the `due-records` endpoint.
- `ClinicPetAccess(clinicId)` and `ClinicPetAccess(petId)` support pet search and the link-candidates lookup.

### Referential Integrity
Cascade deletes are set up correctly: deleting a clinic cascades to all its data. `Staff` is `Restrict` on visits/records, which prevents accidental data loss when deactivating staff (correct — you `isActive: false` them instead).

---

## Issues & Recommendations

### 1. OTP Store is In-Process Memory — Critical for Production
**File:** `backend/src/lib/owner-otp.ts`

```ts
const otpStore = new Map<string, OwnerOtpEntry>()
```

**Problem:** Every time the server restarts (deploy, crash, scale-out to >1 instance), all pending OTPs are lost. Owner login breaks silently during any restart window. With multiple instances, an OTP issued by instance A cannot be verified by instance B.

**Fix options (in order of simplicity):**
1. Add an `OwnerOtp` table with `phone`, `codeHash`, `expiresAt`, `usedAt` and clean it up with a short TTL index. Hash the code before storing (bcrypt or SHA-256 with a pepper).
2. Use Redis with a short TTL if you already have it in infrastructure.

Even for MVP: a database table is the correct answer. The 5-minute TTL + delete-on-use pattern maps cleanly to a `WHERE usedAt IS NULL AND expiresAt > NOW()` query.

```sql
-- Proposed table (add to schema.prisma)
model OwnerOtp {
  id        String   @id @default(cuid())
  mobile    String
  codeHash  String
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  @@index([mobile, expiresAt])
}
```

### 2. OTP Code is Returned in the API Response — Security Risk
**File:** `backend/src/routes/owner-auth.ts` line 37

```ts
return {
  success: true,
  expiresInSeconds: otp.expiresInSeconds,
  devCode: otp.code,   // ← this is in production responses
}
```

The OTP code itself is returned to the caller as `devCode`. This nullifies the security of the OTP — anyone who intercepts the `/request-code` response has the code immediately. The field is labelled `dev` but there is no environment gate on it.

**Fix:**
```ts
return {
  success: true,
  expiresInSeconds: otp.expiresInSeconds,
  ...(env.NODE_ENV === 'development' ? { devCode: otp.code } : {}),
}
```
And add `NODE_ENV` to the `env.ts` validation.

### 3. OTP Has No Rate Limiting
A caller can hit `/api/owner-auth/request-code` repeatedly to probe for valid phone numbers (the 404 response reveals whether a number is registered) and to spam SMS. There is no attempt limit, no cooldown, and no lockout.

**Fix:** Add a short-term rate limit (e.g., 3 attempts per phone per 15 minutes) using either a database counter on the `OwnerOtp` table or a middleware like `@fastify/rate-limit`.

### 4. `PreventiveSchedule` Unique Constraint Is Too Tight
**Schema:** `@@unique([clinicId, petId, careTypeId])`

This means a pet can only have one open schedule entry per care type per clinic. That works today, but breaks down if the same clinic records the same care type twice with different interval configurations (e.g., a 1-year rabies vaccine vs. a 3-year rabies vaccine). The `resolveCareType` function in `preventive-records.ts` creates distinct `CareType` rows per interval configuration, which means `clinicId+petId+careTypeId` being unique is actually correct _given_ that CareType includes the interval. However, the `CareType` unique constraint is:

```
@@unique([clinicId, name, defaultIntervalValue, defaultIntervalUnit])
```

So a clinic can have "Rabies Vaccine (1 YEAR)" and "Rabies Vaccine (3 YEAR)" as separate care types — and a pet could theoretically be on both schedules. The unique constraint on `PreventiveSchedule` would allow only one of them to be tracked. This is probably fine for MVP but worth noting as a future-state concern. Document this assumption.

### 5. `CareType` Has a Denormalised `defaultIntervalDays` Column
```
defaultIntervalDays Int
```

This is a computed value (`intervalToDays(value, unit)`). It is stored to support sorting/comparison without re-computing it in SQL. That is a valid optimisation, but it creates a risk: if `defaultIntervalValue` or `defaultIntervalUnit` is ever updated directly (outside the `resolveCareType` helper), `defaultIntervalDays` will be stale.

**Fix:** Add a comment to the schema that this field must always be set via the helper. Or, if Prisma ever supports computed columns, migrate to that. For now, the current code path (always going through `resolveCareType`) is safe.

### 6. `Appointment.notes` Field Has No Default — Zod Requires It
**Schema:** `notes String` (no `@default("")`)

The `appointmentSchema` on the backend requires `notes: z.string().trim().min(2)`. An empty notes field will be rejected. This is a UX issue but also means `notes` should either be `String?` (optional at the DB level) or the min(2) constraint should be relaxed. Currently if a staff member books an appointment with no notes, they must type at least 2 characters.

**Recommendation:** Make `notes` optional at both schema and Zod levels, or keep it required and document the UX intent.

### 7. `Owner.address` Is Required but `Clinic.address` Is Optional
```
Owner {
  address String   // required
}
Clinic {
  address String?  // optional
}
```

Owner address being required is a business decision, but it creates friction for the OTP-based owner login flow where owners can self-register pets (`POST /api/owner/pets`). The owner record is always created by clinic staff, so the address is populated at registration time — that is fine. But it means owners can never update their own address through the owner portal (there is no owner profile update endpoint). Flag for the owner portal feature backlog.

### 8. No Migration History in the Repo
There is a `prisma/schema.prisma` and a `prisma/seed.ts`, but no `prisma/migrations/` folder visible. If you are using `prisma db push` (schema push) rather than `prisma migrate dev`, you have no migration history, no rollback path, and no CI migration verification.

**Recommendation:** Switch to `prisma migrate dev` in development and commit the migration files. This gives you:
- A record of every schema change with a timestamp.
- A safe `prisma migrate deploy` in production CI.
- The ability to detect drift between schema and database.

### 9. `Pet.ageLabel` Is Stored as Free Text — Parsing Is Fragile
```
ageLabel String?
```

The `getAgeInMonthsFromLabel` function in `pets.ts` does a regex parse of strings like "2 years", "6 months", "10 weeks". This works for the age-bucket filter but is fragile — any typo or alternate format ("2yr", "6 mos") silently falls through to `null`. Since `ageLabel` is entered by clinic staff, normalising or constraining the input format at the UI level would make this more reliable.

**Short-term fix:** Add an enum or structured field (e.g., `ageLabelValue Int?, ageLabelUnit Enum?`) for the structured case. Keep `ageLabel` as a free-text fallback for legacy/import data only.

### 10. `AuditEntry` Snapshots Are Untyped Strings
```
previousSnapshot String?
nextSnapshot     String?
```

These are stored as JSON-serialised strings (`createAuditEntry` calls them with arbitrary objects). There is no schema enforcement, so a typo in any caller can store malformed JSON silently. This also makes querying audit history by field value impossible in SQL.

**Acceptable for MVP**, but document this. When you add an audit log viewer, you will want to parse these as `Json` (Prisma's JSON type) rather than `String` to enable proper querying and type-safe access.

---

## Summary Table

| # | Issue | Severity | Effort |
|---|-------|----------|--------|
| 1 | In-process OTP store (data loss on restart, no multi-instance support) | **Critical** | Medium |
| 2 | OTP code returned in API response (`devCode`) | **High** | Low |
| 3 | No OTP rate limiting | **High** | Low |
| 4 | PreventiveSchedule unique constraint edge case | Low | Informational |
| 5 | Denormalised `defaultIntervalDays` | Low | Informational |
| 6 | `Appointment.notes` required min(2) mismatch with UX | Medium | Low |
| 7 | `Owner.address` required, no owner self-update endpoint | Low | Medium |
| 8 | No Prisma migration history | **High** | Low |
| 9 | `ageLabel` free-text parsing is fragile | Medium | Medium |
| 10 | Audit snapshots stored as untyped strings | Low | Medium (defer) |

**Priority for tomorrow:** Fix items 1, 2, 3, and 8 before the next user-facing deploy.
