# VetCard Product Pivot: Owner + Clinic Platform

## Purpose

This document captures the current product direction discussed after the shared-record clinic MVP.

The new direction keeps the existing centralized `Owner` + `Pet` model, but reframes VetCard as a platform serving two primary user groups:

- pet owners
- veterinary clinics

The goal is to reduce onboarding friction for both sides while keeping a useful shared record model.

## Product direction

VetCard should become a shared pet health platform with two main portals:

- an owner portal
- a clinic portal

Owners use VetCard to access pet profiles, history, reminders, and QR-based sharing.

Clinics use VetCard to manage operational workflow such as pets, records, schedules, appointments, and staff.

These are two views over one shared system, not two separate products.

## Main user types

### Pet owner

Owner onboarding should be lightweight.

Recommended MVP login:

- phone number
- OTP verification

This removes password friction and makes account claiming easy when a clinic has already created a record on the owner's behalf.

### Vet clinic

Clinic onboarding can stay account-based.

Recommended MVP clinic model:

- clinic owner registers an account
- clinic owner creates staff or members
- staff operate inside the clinic workspace

## Core data model

The existing centralized model remains the foundation.

### Owner

- `Owner` is a global identity record
- owner phone number is the primary identifier
- phone number should remain unique

### Pet

- `Pet` is a global identity record
- pets are linked to an owner

### Clinic access

- clinics do not see every pet in the system
- clinics only see pets they have access to
- clinic access remains an explicit relationship

This means VetCard keeps centralized owner and pet identity while clinic visibility is still scoped.

## Clinic creation and linking model

### When a clinic creates a record

If a clinic creates an owner and pet record:

- that clinic automatically gets access to the pet record
- the owner may not have claimed the account yet
- the owner should later be able to log in with phone OTP and access the same VetCard record

If the owner phone number already exists:

- the record should attach to the existing centralized owner identity
- the clinic should still explicitly choose the correct pet when multiple pets exist

### When a clinic links an existing record

Clinics should be able to find an existing pet through:

- owner phone number search
- a temporary full-profile QR

Phone search remains a practical clinic workflow and already aligns with the current repository direction.

## Owner account claim model

Owner identity should have two practical states for MVP:

- `unclaimed`
- `claimed`

### Unclaimed owner

Before the owner claims the account:

- clinic staff can create owner details
- clinic staff can edit owner details
- clinic staff can create pets and records

### Claimed owner

After the owner claims the account through OTP:

- the owner can log in and manage their VetCard profile
- owner identity becomes owner-controlled
- clinic keeps access to pets it created or was granted access to

## Portals and high-level views

### Owner portal

The owner view should be simpler and narrower than the clinic workspace.

Recommended owner MVP surfaces:

- list of pets
- pet profile
- pet history
- owner-uploaded files or notes
- QR sharing
- clinic access management

### Clinic portal

The clinic view should contain operational workflow.

Recommended clinic MVP surfaces:

- pets
- schedules
- appointments
- booking
- visit records
- vaccination and care records
- staff or member management

## QR model

Two QR types are recommended.

### 1. Collar QR

This QR is intended for broad, low-friction access and may be attached to a collar or physical tag.

It should show only limited information, such as:

- pet name
- photo
- emergency contact number
- high-level pet details
- critical alerts if needed

This QR should not expose the full pet profile by default.

### 2. Full-profile QR

This QR is intended for intentional sharing, especially during clinic visits.

It should be:

- time-limited
- owner-controlled
- suitable for opening richer pet information

This may include:

- owner details
- pet details
- medical history
- clinical records

## MVP permission model

The MVP should optimize for flexibility, not strict governance.

The current recommendation is:

- both owner and clinic can update pet profile fields
- both owner and clinic can add and edit clinical records for now
- owner-only content remains a separate lightweight category for personal notes or uploads

This is intentionally permissive and should be paired with attribution and audit history.

## MVP permission tables

These tables reflect the current agreed MVP direction.

`Before claim` means the owner has not yet claimed the account through OTP.

`After claim` means the owner has already claimed the account.

### Owner identity

| Field | Clinic Can Create | Clinic Can Edit Before Claim | Clinic Can Edit After Claim | Owner Can Edit After Claim | Notes |
|---|---|---|---|---|---|
| Full name | Yes | Yes | No | Yes | Owner-controlled after claim |
| Phone number | Yes | Yes | No | Yes, with verification | Primary identity key |
| Email | Yes | Yes | No | Yes | Owner-controlled after claim |
| Address | Yes | Yes | No | Yes | Owner-controlled after claim |

### Owner identity fields

Examples:

- full name
- phone number
- email
- address

Recommended rule:

- clinic can create and edit these while owner is `unclaimed`
- once owner is `claimed`, these become owner-controlled

### Pet profile

| Field | Clinic Can Create | Clinic Can Edit Before Claim | Clinic Can Edit After Claim | Owner Can Edit After Claim | Notes |
|---|---|---|---|---|---|
| Pet name | Yes | Yes | Yes | Yes | Shared field |
| Species / type | Yes | Yes | Yes | Yes | Shared field |
| Breed | Yes | Yes | Yes | Yes | Shared field |
| Sex | Yes | Yes | Yes | Yes | Shared field for MVP |
| Color | Yes | Yes | Yes | Yes | Shared field |
| Birth date / age | Yes | Yes | Yes | Yes | Shared field |
| Weight | Yes | Yes | Yes | Yes | Shared field for MVP |
| Photo | Yes | Yes | Yes | Yes | Shared field |

### Pet profile fields

Examples:

- pet name
- species
- breed
- sex
- color
- birth date or age
- weight
- photo

Recommended MVP rule:

- owner and clinic can both create and edit these

Reasoning:

- data entry mistakes happen
- strict field ownership adds friction early
- correction flexibility is more valuable than rigid governance in MVP

### Clinical records

| Record Type | Clinic Can Create | Clinic Can Edit Before Claim | Clinic Can Edit After Claim | Owner Can Edit After Claim | Notes |
|---|---|---|---|---|---|
| Visit records | Yes | Yes | Yes | Yes | Open editing in MVP |
| Vaccination records | Yes | Yes | Yes | Yes | Open editing in MVP |
| Deworming records | Yes | Yes | Yes | Yes | Open editing in MVP |
| Anti-rabies records | Yes | Yes | Yes | Yes | Open editing in MVP |
| Medication records | Yes | Yes | Yes | Yes | Open editing in MVP |
| Clinical notes | Yes | Yes | Yes | Yes | Open editing in MVP |
| Attachments | Yes | Yes | Yes | Yes | Open editing in MVP |

### Clinical records

Examples:

- visits
- vaccines
- deworming
- anti-rabies
- medications
- notes
- attachments

Recommended MVP rule:

- owner and clinic can both create and edit these for now

Reasoning:

- owners may want to backfill old records
- clinics may need to correct or complete records
- strict authorship rules can be added later

### Owner-contributed records

| Record Type | Clinic Can Create | Clinic Can Edit Before Claim | Clinic Can Edit After Claim | Owner Can Edit After Claim | Notes |
|---|---|---|---|---|---|
| Owner notes | No | No | No | Yes | Owner-authored |
| Owner-uploaded documents | No | No | No | Yes | Owner-authored |
| At-home observations | No | No | No | Yes | Owner-authored |

### Owner-contributed records

Examples:

- owner notes
- owner-uploaded documents
- at-home observations

Recommended MVP rule:

- owner creates and manages these
- clinic can view them

## Audit and attribution requirements

Because the MVP editing model is intentionally permissive, auditability is not optional.

The system should capture at least:

- who created a record
- who last updated a record
- actor type such as owner or clinic staff
- when the change happened
- previous value and next value when possible

The UI should also show lightweight attribution where useful, such as:

- added by owner
- added by clinic
- updated recently

This allows VetCard to stay flexible without losing trust.

## Access rules

Recommended MVP access rules:

- clinic can create owner + pet records
- clinic automatically gets access if it created the record
- clinic can search by phone number to find existing owner-linked pets
- clinic should explicitly select the correct pet when multiple matches exist
- owner can later claim the account by OTP
- owner can generate temporary full-profile QR access
- collar QR remains limited-information only

### Access rules matrix

| Action | Clinic | Owner | Notes |
|---|---|---|---|
| Create owner + pet | Yes | Yes | Both sides can originate records |
| Auto access if clinic created pet | Yes | n/a | Immediate clinic access |
| Link existing pet by phone search | Yes | n/a | Clinic selects correct pet |
| Claim owner account by OTP | No | Yes | Owner-only action |
| Generate full-profile QR | No | Yes | Owner-controlled |
| Use collar QR for limited info | n/a | Yes | Public-facing limited access |
| Revoke clinic access later | No | Yes | Future owner access management |

## Relationship to the current repository

This direction still fits the strongest parts of the current codebase.

Already aligned in the repository:

- centralized `Owner`
- centralized `Pet`
- clinic-scoped pet visibility through explicit access
- phone-based lookup and linking

This means the pivot is not a total reset. It is a product-direction shift built on top of an already useful data model.

## MVP principles

- reduce onboarding friction for owners
- reduce operational friction for clinics
- preserve centralized owner and pet identity
- keep clinic visibility scoped through access
- prefer flexible editing with strong audit history
- use QR for sharing, but separate collar-safe access from full-profile access

## Open topics for later

These do not need to block the MVP but should be revisited later:

- richer clinic access lifecycle states
- revocation and approval flows
- whether clinics should always edit every clinical record
- whether stricter authorship rules should be introduced later
- support or admin tooling for disputed ownership or wrong phone matches
