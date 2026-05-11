# Future-State Shared Records Model

## Purpose

This document captures the intended future direction for VetCard beyond the current shared-record rollout.

VetCard is no longer clinic-scoped at the pet/owner identity layer. Shared `Owner` and `Pet` records, clinic-linked access, privacy-safe shared-history labels, and clinic-local workflow separation are already implemented.

The remaining future-state work is now about **hardening and extending** that model without losing clinic ownership of operational workflow.

## Current status

Already implemented in the live product:

- shared `Owner` identity
- shared `Pet` identity
- clinic-linked pet access
- owner-phone normalization for write and lookup
- privacy-safe labels such as **Recorded elsewhere** and **Completed elsewhere**
- clinic-local appointments and due workflow
- explicit **New Pet Profile** vs **Link Pet Profile** intake flows

Still future / incomplete:

- stronger owner-consent flows beyond in-clinic confirmation
- richer access lifecycle states such as revoked, limited, pending, or expired
- clearer audit/access history UI
- more explicit operational handling for states like **superseded**

## Product goal

Allow a pet owner to bring a pet to another clinic and, with owner approval, let that clinic access the correct shared medical history.

## Core design principle

Split the system into:

- **Shared medical truth**
- **Clinic-local operations**

This keeps real care history portable while preserving each clinic's own schedule, reminders, and internal workflow.

## Proposed model

### Shared entities

These should become platform-level records rather than directly clinic-owned:

- `Owner`
- `Pet`

### Clinic-linked access

Clinics should connect to shared pets and owners through explicit access or relationship records instead of direct ownership on the core entity.

Examples of future relationship concerns:

- which clinics can access a pet
- which clinic first registered the pet
- whether owner consent has been granted
- whether access is active, revoked, or limited

### Shared medical records

These should become visible across clinics once access is granted:

- completed visits
- completed preventive events
- diagnoses
- treatments
- recurring care and reminder history

Each shared medical record should preserve **authoring clinic** metadata internally for provenance, permissions, and auditability.

However, to protect clinic privacy, the shared-history UI should not automatically expose another clinic's actual name to a different clinic.

Recommended display rule:

- records created by the current clinic can be shown as **Recorded here**
- records created by another clinic should be shown as **Recorded elsewhere** or **Completed elsewhere**
- the actual clinic identity remains stored internally but is not shown by default in the cross-clinic UI

### Clinic-local workflow records

These should remain local to the clinic that created them:

- appointments
- reminders
- due tasks
- internal workflow state
- internal notes that are not meant to be shared

## Owner-controlled sharing

Cross-clinic access should be controlled by the pet owner.

Current implementation:

1. Clinic BBB searches by owner phone number through **Link Pet Profile**.
2. Staff confirms owner approval in clinic.
3. Clinic BBB links the selected pet into its own workspace.
4. Clinic BBB can then view shared history and create its own new records.

Future target:

1. Clinic BBB finds the likely pet record.
2. The owner approves access through a stronger flow such as OTP, consent link, or explicit access request.
3. Clinic BBB can view shared history.
4. Clinic BBB creates its own new records under its own clinic identity.

This avoids giving the first clinic permanent control over a pet's broader history.

## Cross-clinic visit example

1. Clinic AAA creates a pet profile and preventive history.
2. The owner later visits Clinic BBB.
3. Clinic BBB locates the pet and requests access.
4. The owner approves sharing.
5. Clinic BBB can see prior shared history, but records from Clinic AAA are displayed as coming from **elsewhere** rather than exposing the clinic's name by default.
6. New records created at Clinic BBB remain authored by Clinic BBB.

## Operational workflow example

If Clinic AAA scheduled a preventive but the owner instead completes that preventive at Clinic BBB:

- the completed preventive event becomes part of the shared medical history
- Clinic BBB sees its own event as recorded here, while other clinics would see it as completed elsewhere
- Clinic AAA keeps its own local scheduled workflow item
- Clinic AAA's scheduled item should move to a state such as **completed elsewhere** or **superseded**

This preserves both:

- the actual medical truth
- the clinic's local operational history

## Owner and pet matching

Pet name alone must not be used as the main identifier.

### Recommended lookup flow

1. Search by **owner phone number**
2. Show candidate pets under that owner
3. Confirm the correct pet using details such as:
   - pet name
   - species
   - breed
   - sex
   - age or birth date
   - color
   - photo
4. Require owner approval before revealing shared history

### Identifier guidance

- **Internal canonical identifier:** platform-generated pet ID
- **Best real-world identifier when available:** microchip number
- **Primary practical lookup for now:** owner phone number

## Phone number assumptions

For now, the product assumes every pet owner has a phone number.

That means:

- owner phone number should be required for pet registration
- phone number becomes the primary cross-clinic lookup key
- no phone number means no reliable cross-clinic retrieval

## Phone normalization

Phone normalization is required before this model can work reliably.

Current implementation now normalizes these inputs to the same canonical internal value:

- `09123456789`
- `639123456789`
- `+639123456789`

Current canonical storage format:

- `639123456789`

Remaining follow-on requirements:

1. Normalize phone numbers on write
2. Normalize phone numbers on lookup
3. Backfill imported legacy numbers if historical non-normalized data is ever introduced again
4. Keep one canonical storage format across future integrations/import paths

The UI can still display the number in a friendlier format if needed.

## Edit and ownership rules

To avoid cross-clinic conflicts:

- clinics should be able to **view** shared records once access is granted
- clinics should generally only **edit records they created**
- authoring clinic should always be preserved internally
- cross-clinic UI should default to privacy-safe labels such as **Recorded elsewhere** instead of exposing another clinic's actual name

This keeps provenance clear, protects clinic privacy, and avoids one clinic rewriting another clinic's chart.

## Transition from the earlier model

Historical starting model:

- `PetOwner` is clinic-scoped
- `Pet` is clinic-scoped
- owner uniqueness is enforced as `(clinicId, mobile)`

Current implemented model:

- shared `Owner`
- shared `Pet`
- explicit clinic access through `ClinicPetAccess`
- shared medical history with clinic provenance
- clinic-local workflow records

This transition already used a **fresh-start rollout** because earlier data could be treated as disposable dev/test data.

## Suggested remaining implementation tracks

1. **Consent hardening**
   - move from in-clinic confirmation to OTP, consent link, or explicit access request
2. **Access lifecycle**
   - support richer states such as pending, approved, denied, revoked, or limited
3. **Shared record clarity**
   - keep improving UI for local vs shared context across more screens
4. **Operational state handling**
   - support clearer lifecycle states such as completed elsewhere / superseded
5. **Audit and support tooling**
   - expose useful audit/access history in the UI

## Recommended follow-on roadmap

### Phase 1: consent hardening

- strengthen owner approval beyond a checkbox
- store clearer consent evidence and timing
- add UI states for approval status where needed

### Phase 2: access lifecycle and auditability

- add richer access states
- expose audit/access history in useful admin surfaces
- make support/debugging easier without querying the database directly

### Phase 3: workflow reconciliation polish

- refine states like **completed elsewhere** and **superseded**
- improve workflow visibility for why an item is open, resolved elsewhere, or no longer actionable
- continue polishing shared-record context across pet/profile/calendar/detail surfaces

## Summary

The future-state direction is:

- **shared pet and owner identity**
- **owner-controlled cross-clinic access**
- **shared medical history**
- **clinic-local operations**
- **privacy-safe cross-clinic labels**
- **phone-first retrieval with normalized numbers**

The shared-record foundation is already in place. The next stage is to make that foundation more trustworthy, more explicit, and easier for clinics to operate day to day.
