# Pet Records Digital Booklet Plan

Last updated: 2026-05-05

## North Star

VetCard should feel like the pet's digital health booklet, not a generic CRM pet profile.

Clinics and owners already understand the paper booklet mental model: pet identity, vaccination pages, deworming history, heartworm care, visit notes, and special health remarks. VetCard should preserve that familiar structure while making it searchable, shareable, reminder-driven, and easier to keep current.

## Sample Record Observations

The sample folder `sample-pet-records/` contains 12 phone photos of real paper records:

- Billing / visit slips from Pet Solution Veterinary Clinic
- A blank vaccination certificate
- A green Pet Solution health record booklet
- Pet/owner identity pages
- Vaccination records with product stickers, lot numbers, expiry dates, veterinarian stamps/signatures
- Deworming history with medication and re-deworming dates
- Heartworm therapy table
- Special diet, medication, and allergies page
- Printed vaccination education and recommended schedule pages

The important product lesson: the paper system is not just "notes." It is a structured health booklet with category-specific tables.

## Target Information Architecture

Pet detail should be organized around these sections:

- **Overview**: pet identity, owner, clinic access, current health alerts, next due summary
- **Timeline**: merged chronological record of visits, vaccines, deworming, heartworm, and health-profile changes
- **Vaccines**: vaccination table/cards with product, lot, expiry, vet, and next due
- **Deworming**: date given, medication/product, next deworming date, vet, notes
- **Heartworm**: date, product/brand, next due, vet, notes
- **Visits**: clinical visit history, treatment, diagnosis, follow-up, weight
- **Health Notes**: allergies, ongoing medications, special diet, medical alerts

Ship the pet detail shell once with all tabs visible. Early phases can render "coming soon" states for unfinished sections, but the navigation/chrome should not need another rebuild.

## Data Model Decisions

### Care Category

Add category to `CareType`, not `PreventiveRecord`.

`CareType.category` is a property of what the care item is. A record inherits category through its `careType` relation.

Proposed enum:

```prisma
enum CareCategory {
  VACCINATION
  DEWORMING
  HEARTWORM
  OTHER
}
```

Do not duplicate category on `PreventiveRecord`; that creates drift risk.

### CareType Name vs Product Details

Keep these concepts separate.

- `CareType.name`: the clinical/schedule line item, such as `Rabies Vaccine - 1 Year`
- `PreventiveRecord.productName`: the actual product administered, such as `Rabisin`
- `PreventiveRecord.manufacturer`: product maker, such as `Boehringer Ingelheim`
- `PreventiveRecord.lotNumber`: lot or batch number from sticker
- `PreventiveRecord.serialNumber`: serial number when present
- `PreventiveRecord.expiryDate`: product expiry from sticker

This matches the booklet: the row/category is one thing; the sticker/product administered on a date is another.

### PreventiveRecord Fields

Add category-specific details to the existing shared preventive record infrastructure:

```prisma
model PreventiveRecord {
  productName   String?
  manufacturer  String?
  lotNumber     String?
  serialNumber  String?
  expiryDate    DateTime?
  // existing administeredOn, nextDueDate, notes, careTypeId, clinicId, petId stay
}
```

These fields are most important for vaccination, but can also support deworming and heartworm products.

### Preventive Schedule Summary

Keep `PreventiveSchedule` keyed around clinic, pet, and care type for now.

For v1, compute category-level summaries at query time:

- next vaccination due
- next deworming due
- next heartworm due

Do not add a category-level schedule cache yet.

### Existing Data Backfill

Existing `CareType` rows need category assignment during migration.

Use a migration/backfill script with name matching:

- vaccine, vaccination, rabies, DHPP, DHLPP, parvo, distemper, leptospirosis, bordetella, kennel cough -> `VACCINATION`
- deworm, worm, praziquantel, pyrantel, anthelmintic -> `DEWORMING`
- heartworm -> `HEARTWORM`
- fallback -> `OTHER`

Staff can correct misses later from care settings if needed.

### Pet Health Profile

Health notes should be structured tables, not JSON.

Proposed models:

```prisma
model PetAllergy {
  id          String   @id @default(cuid())
  petId       String
  allergen    String
  severity    String?
  reaction    String?
  notes       String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model PetMedication {
  id          String   @id @default(cuid())
  petId       String
  name        String
  dose        String?
  frequency   String?
  route       String?
  startDate   DateTime?
  endDate     DateTime?
  notes       String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model PetDietNote {
  id          String   @id @default(cuid())
  petId       String
  dietName    String
  remarks     String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

Audit entries should cover create/update/delete for these records.

### Visits

Visits should remain part of the digital booklet.

Current `Visit` already has:

- `reasonForVisit`
- `findingsNotes`
- `treatmentGiven`
- `diagnosis`
- `followUpNotes`

Missing booklet field:

- `weightKg` at visit time

Add visit weight during the visit-upgrade phase. Temperature and vitals can wait unless clinic feedback asks for them.

### Documents

Defer document attachments and imported-page evidence.

Backfill/import is useful, but it should not lead the core product. The native digital record experience comes first. When we add imports later, source photos should attach to imported records and EXIF metadata should be stripped.

## Timeline Rules

Timeline should merge:

- visits
- vaccinations
- deworming
- heartworm care
- allergy changes
- medication changes
- diet/health-alert changes

Render health-profile changes differently from medical events. They are current-state changes, not treatments administered.

Example labels:

- `Vaccination recorded`
- `Deworming recorded`
- `Heartworm prevention recorded`
- `Visit completed`
- `Allergy added`
- `Medication updated`
- `Diet note changed`

## Phased Implementation Plan

### Phase 1: Pet Record IA Shell

Status: shipped locally.

Goal: make the pet detail page feel like a digital booklet before deep schema work.

Tasks:

- Redesign clinic pet detail page around tabs/sections:
  `Overview`, `Timeline`, `Vaccines`, `Deworming`, `Heartworm`, `Visits`, `Health Notes`
- Use existing data where available.
- Show polished empty/coming-soon states for sections that are not yet fully functional.
- Keep owner-facing pet detail aligned, but clinic staff page is the first priority.

Acceptance checks:

- Staff can open any pet and immediately understand the booklet structure.
- Existing visits and preventive records still appear.
- No existing action paths regress: edit pet, add visit, add care item, appointment links.

### Phase 2: Vaccination Proof Point

Status: complete locally.

Goal: make vaccination feel truly booklet-native.

Tasks:

- Add `CareCategory` enum.
- Add `CareType.category`.
- Add preventive record fields:
  `productName`, `manufacturer`, `lotNumber`, `serialNumber`, `expiryDate`.
- Backfill existing care types with name matching.
- Update API types and validation.
- Rebuild vaccine record form/list around booklet fields.
- Add vaccine-specific display cards/table.
- Ensure lot number is searchable or at least filterable soon after this phase.

Acceptance checks:

- A clinic can enter a vaccine record from a sticker without dumping details into notes.
- Vaccine records show date, vaccine/care type, product, lot, expiry, vet, next due.
- Existing preventive records continue to load after migration.

Implemented notes:

- `CareCategory` now lives on `CareType`.
- `PreventiveRecord` now captures product, manufacturer, lot/batch, serial, and expiry.
- The care-record form now starts with a booklet section selector and exposes vaccine sticker fields.
- Pet detail vaccine cards now render product/sticker details when available.
- The vaccine tab now has a booklet-style record layout plus local search across vaccine, product, manufacturer, lot, serial, and notes.
- Category-specific quick actions open the form with the matching booklet section selected.
- The local database migration has been applied.

### Phase 3: Deworming And Heartworm

Status: complete locally.

Goal: complete the core paper-booklet preventive categories using the same shared infrastructure.

Tasks:

- Add category-specific forms/views for deworming and heartworm.
- Compute category-level next due summaries query-time.
- Update timeline rendering for all preventive categories.
- Add clear empty states and quick actions from each tab.

Acceptance checks:

- Deworming can be entered with date given, medication/product, and next deworming date.
- Heartworm can be entered with date, product/brand, and next due.
- Timeline distinguishes vaccine, deworming, and heartworm records.

Implemented notes:

- Deworming and Heartworm quick actions now open the care form with the matching booklet section selected.
- The care form now changes placeholder text, product labels, helper copy, and notes prompts by category.
- Deworming and Heartworm tabs now use the same booklet-style searchable record layout as Vaccines.
- Overview now computes category-level next due summaries from the current preventive records.

### Phase 4: Health Notes

Status: complete locally.

Goal: support current-state medical facts that paper booklets record separately.

Tasks:

- Add structured models:
  `PetAllergy`, `PetMedication`, `PetDietNote`.
- Add API routes and audit coverage.
- Add Health Notes tab UI.
- Add timeline entries for material health-profile changes.
- Add owner-visible display for clinically important active items.

Acceptance checks:

- Staff can add/edit active allergy, medication, and diet notes.
- Active health notes are visible in Overview and Health Notes.
- Timeline can show health-profile changes without confusing them with treatments.

Implemented notes:

- Added structured `PetAllergy`, `PetMedication`, and `PetDietNote` models with clinic ownership and active/inactive state.
- Added staff API routes for creating, updating, and marking health notes inactive, with audit entries.
- The staff Health Notes tab now supports active allergy, medication, and diet-note entry and display.
- Timeline now includes allergy, medication, and diet-note changes as health-profile changes.
- Owner and public share views now surface active health notes, including emergency share cards.
- The local database migration has been applied.

### Phase 5: Visit Upgrade

Status: complete locally.

Goal: bring visit records closer to clinic slips while keeping entry fast.

Tasks:

- Add `Visit.weightKg`.
- Update add/edit visit form.
- Display visit weight in visit cards and timeline.
- Consider visit-template copy only after real clinic feedback.

Acceptance checks:

- Staff can record weight for each visit.
- Pet profile can show latest weight and visit-specific weight history.
- Existing visit records remain valid with empty weight.

Implemented notes:

- Added optional `Visit.weightKg`.
- Updated visit create/edit API validation and persistence.
- Added visit weight to the staff visit form.
- Staff visit detail, pet visit cards, timeline summaries, calendar visit cards, owner views, and public share history now display visit weight when present.
- Existing visit records continue to load with empty weight.
- The local database migration has been applied.

### Phase 6: Backfill / Import Later

Status: in progress locally.

Goal: one-time migration from paper records into VetCard.

Decision: Phase 6 starts with **manual historical entry**, not upload/OCR. Uploading paper booklet pages is likely a one-time onboarding event, but clinics still need a reliable way to copy the high-value rows into structured VetCard records. OCR can come after the manual workflow proves the right fields and labels.

Tasks:

- Add explicit source metadata for preventive records:
  `CLINIC_RECORDED` vs `HISTORICAL_BOOKLET`.
- Let staff mark a care record as copied from a paper booklet.
- Let staff add an optional source note, such as `Owner booklet page 3`.
- Surface historical-booklet labels in staff, owner, and public-share booklet views.
- Keep historical records structured: vaccine product, lot, expiry, deworming product, next due, and notes should use the same native fields.
- Do not attach files yet.
- Later: upload/capture paper pages.
- Later: strip EXIF metadata from uploads.
- Later: extract OCR drafts for staff review.
- Later: confirm drafts into structured booklet records.
- Later: attach original source image to imported entries as evidence.

Acceptance checks:

- Backfill is clearly a one-time onboarding flow, not the normal daily workflow.
- Imported records become structured VetCard entries after review.
- Staff and owners can tell when a record was copied from a paper booklet.
- Original images are available for audit later, but do not dominate the UI.

Implemented notes:

- Added explicit preventive record source metadata for clinic-recorded vs historical booklet records.
- The care-record form now includes a source selector and optional source note for paper booklet backfill.
- Historical booklet records display with source labels on staff, owner, and public share surfaces.

## Open Questions

- Should clinic admins be able to manage care type categories in settings?
- Should inactive allergies/medications remain visible by default or collapse into history?
- Should historical-booklet entries affect future due schedules by default, or should staff choose per entry?
- When OCR arrives, should imported source images live per record or per import batch?
- Should owners be allowed to request backfill from their side, or should it remain clinic-driven?

## Immediate Next Step

Finish Phase 6 manual historical entry, then test it across staff pet detail, owner pet detail, and public share.
