# VetCard current state snapshot

## Product position

VetCard is now a working **multi-clinic web MVP** with shared pet identity, clinic-linked access, clinic-local appointments, shared medical history, phone normalization, and privacy-safe cross-clinic labels. It feels like a real internal clinic product and is now much closer to the intended cross-clinic future state, though it is still not production-hardened.

## Current architecture

- **Frontend:** React + TypeScript + Vite
- **Routing / data / forms:** React Router + TanStack Query + React Hook Form + Zod
- **Backend:** Fastify + TypeScript
- **Database:** PostgreSQL via Prisma
- **Auth:** JWT session API with persisted client login
- **File uploads:** local filesystem storage under `uploads/pets/avatar`

## Core data model

### Shared identity

- `Owner` is now a **shared global record**
- `Pet` is now a **shared global record**
- owner mobile numbers are normalized to a canonical Philippine mobile format for storage and lookup

### Clinic-linked access

- clinics gain access to pets through `ClinicPetAccess`
- a clinic can only open pets linked into its own workspace
- when a clinic links a shared pet, the same pet can appear in multiple clinic workspaces without duplicating identity

### Shared medical truth

These are now shared across clinics that have access to the pet:

- visits
- preventive records

They keep internal clinic provenance, but the UI shows privacy-safe labels such as:

- **Recorded here**
- **Recorded elsewhere**
- **Completed elsewhere**

### Clinic-local workflow

These remain clinic-local:

- appointments
- staff accounts
- clinic care types
- due workflow state through `PreventiveSchedule`

## Current capabilities

### Authentication and clinic workspace

- login and clinic registration are implemented
- sessions stay clinic-scoped
- staff roles remain clinic-local

### Home / dashboard

- Home now prioritizes action-first clinic workflow instead of mixed summary/history
- the page emphasizes:
  - today overview
  - urgent follow-up items
  - quick actions
  - today's schedule
  - clinic snapshot counts
- Recent Visits is no longer a primary homepage section

### Pets

- pet search and list are backed by real API data
- search supports pet name, owner name, and normalized phone lookup
- pet entry is now split into two explicit flows:
  - **New Pet Profile** creates a brand-new shared pet and links it to the current clinic
  - **Link Pet Profile** looks up shared pets by owner phone number, then links the selected pet into the current clinic after in-clinic owner confirmation
- pet creation now:
  - normalizes owner phone numbers
  - reuses shared owner identity
  - blocks accidental cross-clinic auto-linking and sends staff to the dedicated link flow instead
- pet editing updates the shared pet/owner identity for accessible pets

### Shared pet profile

- Pet Profile shows:
  - shared pet identity
  - owner details
  - clinic-local appointments
  - shared visit history
  - shared care/reminder history
- when history came from another clinic, the UI shows **elsewhere** labels instead of revealing the other clinic name
- preventive care now works as a broader **care schedule** flow with no hard-coded vaccine/deworming categories or separate record pages
- staff can record care items with:
  - free-text names
  - a simple **Date** field
  - either a **one-time** event or a structured recurring cadence such as every 2 weeks or every 3 months
- the form now records the current signed-in staff member automatically instead of asking staff to pick `Administered by`
- the audit identity is now kept off the main form surface, so the page stays focused on the care item workflow
- the preventive form now uses the same fixed bottom action bar pattern as other create/edit pages such as Add Pet
- preventive record surfaces now also label records created in the current clinic as **Recorded here** for clearer local-vs-shared context

### Appointments / calendar

- appointments remain clinic-local
- calendar still shows only the logged-in clinic's appointment and visit workflow
- appointment detail and add/edit flows continue to work with the new shared pet model
- cancelling an appointment from the detail screen now requires confirmation before the status is changed
- appointments now support an explicit **Missed** status for no-shows
- appointment booking notes stay on the booking side and no longer auto-populate visit follow-up fields

### Visits

- clinics can create visits for any pet linked into their workspace
- visit history is shared across linked clinics
- other clinics' records are visible with privacy-safe labels
- visit edit is now implemented for records created in the current clinic

### Preventive records and due workflow

- preventive records are shared across linked clinics
- due workflow is now clinic-local through `PreventiveSchedule`
- preventive due state now tracks **per care type**, so staff can manage each recurring care item independently without vaccine/deworming buckets
- clinic care types can now vary by cadence, so teams can keep multiple reminders with the same label but different repeat intervals
- when a preventive event is recorded at another clinic, another clinic's open due item for the same care type can move out of its active due list instead of remaining overdue forever
- one-time care items now stay in history without generating a future due reminder, while recurring items continue to calculate and maintain their next due date

### Account / settings / feedback

- clinic team, settings, security, and feedback remain intact
- staff/clinic management behavior is unchanged apart from fitting the new shared pet model

## Local screen-recording data

The dev database now seeds:

- **Harborview Veterinary Clinic**
- **Northpoint Animal Hospital**
- realistic staff, owner, pet, appointment, visit, health-note, share-link, and preventive-care records
- six pet profiles with local avatar images served from `/uploads/pets/avatar`
- today-focused appointments, overdue follow-up, and due-soon care reminders for screen recordings
- shared history that demonstrates **Recorded elsewhere / Completed elsewhere**

Local recording logins:

1. `reception@harborviewvet.ph` / `password123`
2. `owner@harborviewvet.ph` / `password123`

## Current runtime / local dev

- PostgreSQL: Docker Compose service `vetcard-postgres`
- Backend API: `http://127.0.0.1:3001` when running
- Web dev server: `http://127.0.0.1:8080` when running

## Known gaps / not done yet

- owner approval is currently handled as an in-clinic confirmation step during linking, not a full OTP/client portal flow
- audit history is still backend-only; there is no meaningful audit UI yet
- test coverage is still limited even though workflow coverage now includes auth/session restore, route state handling, free-text care reminder capture, care schedule filtering, appointment missed handling, and visit edit/create behavior
- production hardening is still incomplete:
  - production env setup
  - backup / restore strategy
  - file storage beyond local uploads
  - operational monitoring / secrets / security review

## Recommended next priorities

1. **Finish owner-consent hardening**
   - move from in-clinic confirmation to OTP or consent-link approval
   - add explicit access-request UX if needed

2. **Add audit history UI**
   - expose the existing backend audit trail in a useful owner/admin surface
   - start with pets, visits, appointments, preventive records, and staff actions

3. **Broaden shared-record workflow polish**
    - add stronger linking/matching guidance when staff add pets
    - continue improving shared-history clarity on more screens

4. **Expand workflow coverage**
    - keep growing tests around the most failure-prone user journeys
    - cover more shared-record, preventive, and appointment-state behavior

## Notes

- The app is no longer clinic-isolated at the pet identity layer.
- The current phase is now **shared-record rollout with follow-up polish**.
- Nested form/detail flows now preserve their original parent context more reliably, reducing back-navigation loops caused by transient pages overwriting the launch screen.
- For an implementation-ready backlog of current gaps, see `docs/actionable-gaps.md`.
