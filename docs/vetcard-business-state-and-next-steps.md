# VetCard business state, value, and next steps

**Date:** May 7, 2026  
**Audience:** business owners, clinic decision-makers, advisors, partners, and early customers  
**Purpose:** explain what VetCard is, what value it creates, where the product stands today, and what should happen next.

---

## 1. Executive summary

VetCard is a digital pet health record and veterinary clinic workflow platform.

The product has moved beyond a static concept. It is now a working web MVP with a clinic portal, owner portal foundations, shared pet identity, shared medical history, appointments, visits, preventive care reminders, staff access, and cross-clinic record linking.

The business value is straightforward:

- clinics can reduce dependence on paper records
- staff can find pet and owner records faster
- appointments, visits, and follow-ups become easier to manage
- preventive care reminders become more structured
- pet history can follow the pet across participating clinics
- owners can eventually access and share their pet's records directly

VetCard is currently best positioned as a pilot-ready product for a small clinic or branch that wants to digitize active workflows first, rather than migrate all historical paper records immediately.

The next business milestone should be a controlled pilot with one real clinic. The goal of that pilot is to prove daily operational value, validate willingness to pay, and identify the smallest set of production hardening work required before wider rollout.

---

## 2. What VetCard is

VetCard is a shared pet health platform with two connected sides:

1. **Clinic portal**
   - used by clinic owners, managers, receptionists, and veterinary staff
   - supports daily clinic operations such as pet records, search, appointments, visits, preventive care, and staff access

2. **Owner portal**
   - used by pet owners
   - supports pet profile access, owner login, pet history viewing, account claiming, and record sharing foundations

The long-term product is not just a clinic database. It is a shared pet record network where owners and clinics can work from the same underlying pet identity, while clinic access remains controlled.

---

## 3. The problem VetCard solves

Many veterinary clinics still rely on paper index cards, notebooks, chat threads, spreadsheets, or fragmented systems.

This creates predictable operational problems:

- records are slow to retrieve during intake
- history can be incomplete when a pet visits another branch or clinic
- follow-ups are easy to miss
- vaccine, deworming, and preventive care schedules are difficult to track consistently
- owners often do not have a clean copy of their pet's medical history
- staff accountability is limited when updates are informal or paper-based
- expanding to multiple branches makes record duplication worse

VetCard addresses this by creating one structured digital record around the pet, then giving clinics and owners controlled ways to use that record.

---

## 4. Core value proposition

### For clinics

VetCard helps clinics operate with less paper, faster lookup, and clearer daily workflow.

Primary value:

- faster pet and owner search
- cleaner appointment handling
- structured visit documentation
- preventive care reminders and due tracking
- centralized pet profile as the staff working screen
- team access and basic clinic administration
- shared history visibility when another linked clinic has already recorded care

Business impact:

- less time spent searching records
- fewer missed follow-ups
- better continuity of care
- more consistent staff workflow
- stronger foundation for multi-branch operations

### For pet owners

VetCard gives owners a path toward owning and sharing their pet's record.

Primary value:

- easier access to pet information
- clearer history of visits and preventive care
- QR-based sharing foundations
- account claiming through owner identity
- future ability to manage clinic access and personal notes

Business impact:

- stronger owner trust
- more modern clinic experience
- better retention through reminders and continuity

### For the business

VetCard can be sold as a clinic workflow subscription first, then expanded into an owner-connected network product.

Near-term monetization can come from:

- clinic setup fee
- monthly clinic subscription
- assisted migration or onboarding package
- multi-branch rollout fee
- support and customization package

Longer-term monetization could include:

- owner premium features
- QR tag or card products
- branch network pricing
- reporting and analytics
- integrations with billing, inventory, or insurance partners

---

## 5. Where we are today

VetCard is currently a working multi-clinic web MVP.

The product has these implemented foundations:

- React and TypeScript frontend
- Fastify and TypeScript backend
- PostgreSQL database through Prisma
- clinic authentication and session handling
- owner authentication foundations
- shared owner and pet records
- clinic-specific access to shared pets
- appointment and calendar workflow
- visit records
- preventive care records and reminders
- staff/team management
- feedback and account settings screens
- local demo data for two clinics

The product is not yet production-hardened. It is strong enough for demos, internal testing, and a controlled pilot, but it should not be treated as a fully production-ready healthcare system until the remaining security, audit, deployment, and operational items are addressed.

---

## 6. Current product capabilities

### 6.1 Clinic workspace and login

Clinics can register, log in, and operate inside a clinic-scoped workspace.

Current capabilities:

- clinic registration
- staff login
- persisted sessions
- clinic-local staff accounts
- account, security, team, and settings screens

Business value:

- the clinic has a controlled operating environment
- staff access can be managed inside the product
- the product can support real clinic onboarding discussions

### 6.2 Pet and owner records

VetCard supports structured pet records connected to owner details.

Current capabilities:

- create new pet profiles
- edit accessible pet profiles
- store owner details
- normalize Philippine mobile numbers for reliable lookup
- search by pet name, owner name, or mobile number
- support pet photos

Business value:

- faster retrieval than paper cards
- fewer duplicate owner records
- pet profile becomes the central operating page

### 6.3 Shared pet identity across clinics

VetCard now has a shared record model instead of a purely clinic-isolated model.

Current capabilities:

- one global owner identity
- one global pet identity
- clinic access is granted through an explicit link
- clinics can link an existing shared pet by owner phone lookup
- records from another clinic can appear with privacy-safe labels such as "Recorded elsewhere" or "Completed elsewhere"

Business value:

- supports the larger vision of pet records that follow the pet
- reduces duplicated pet profiles
- creates a meaningful differentiator versus a simple clinic-only database

Current boundary:

- owner consent for cross-clinic linking is still basic and needs hardening before broad rollout

### 6.4 Home and daily operations

The clinic home screen is organized around daily action.

Current capabilities:

- today overview
- urgent follow-up items
- quick actions
- today's schedule
- clinic snapshot counts

Business value:

- staff can quickly see what needs attention today
- the product feels useful during real clinic operations, not only as record storage

### 6.5 Appointments and calendar

Appointments remain clinic-local.

Current capabilities:

- create appointments
- edit appointments
- view appointment details
- view the clinic calendar
- mark scheduled, completed, cancelled, or missed
- require confirmation before cancellation

Business value:

- improves front-desk scheduling workflow
- supports no-show handling
- separates booking notes from clinical visit notes

### 6.6 Visit documentation

Visits are shared medical history for clinics that have access to the pet.

Current capabilities:

- create visits
- edit visits created by the current clinic
- record reason, findings, diagnosis, treatment, and follow-up
- show visit history on pet profiles
- display shared history from linked clinics with privacy-safe context

Business value:

- turns consultation notes into structured pet history
- improves repeat-visit continuity
- creates the medical-history foundation owners and clinics care about

### 6.7 Preventive care and reminders

Preventive care has evolved beyond fixed vaccine and deworming buckets.

Current capabilities:

- create one-time care records
- create recurring care records
- support flexible cadence, such as every 2 weeks or every 3 months
- track due state per care type
- keep clinic workflow local while preserving shared medical truth
- update local due state when care was completed elsewhere

Business value:

- supports a wider set of clinic follow-up workflows
- helps reduce missed preventive care
- gives clinics a practical reminder system tied to medical history

### 6.8 Owner-side foundations

VetCard has owner portal foundations in place.

Current capabilities:

- owner login foundation
- owner pet list and pet profile screens
- public sharing and owner sharing screens
- QR sharing foundations
- owner account screen

Business value:

- positions VetCard as more than clinic software
- creates a future path for owner engagement, QR tags, and direct record access

---

## 7. Evidence of progress

VetCard is no longer just a pitch or prototype screen.

Concrete progress includes:

- working frontend and backend monorepo
- real database schema and migrations
- seeded demo environment with two clinics
- shared owner and pet model implemented
- pet creation and pet linking flows implemented
- clinic-local appointments implemented
- shared visits and preventive records implemented
- preventive care generalized into flexible care schedules
- owner-side surfaces started
- local runtime supports backend, database, and web app
- test coverage exists for selected workflows
- multiple product review documents and current-state docs are maintained

This means the business can now shift from "can this be built?" to "can this create enough value in a real clinic to sell and retain?"

---

## 8. Readiness assessment

### Demo readiness

Status: **Ready**

VetCard is ready for structured demos using the seeded demo data. It can show the main business story:

- clinic workflow
- pet search
- appointments
- visits
- preventive care
- shared record context
- owner portal direction

### Pilot readiness

Status: **Conditionally ready**

VetCard can be piloted with one friendly clinic if expectations are managed.

Recommended pilot constraints:

- start with new and active patients only
- use the app alongside existing records during the pilot
- keep pilot users limited to a small clinic team
- avoid promising full regulatory or enterprise-grade readiness
- collect staff feedback weekly

### Production readiness

Status: **Not yet ready**

Before wider paid production use, VetCard still needs:

- stronger owner-consent flow
- audit history UI
- production deployment setup
- backup and restore plan
- improved security hardening
- stronger test coverage
- monitoring and operational support process
- non-local file storage plan for pet images

---

## 9. Main gaps and risks

### 9.1 Owner consent for shared records

Current state:

- cross-clinic linking uses in-clinic confirmation

Risk:

- this is not strong enough for broad shared-record rollout

Recommended next step:

- implement staff-confirmed consent with stronger audit trail first, then OTP-based approval later

### 9.2 Audit visibility

Current state:

- audit behavior exists in backend foundations, but there is no meaningful business-facing audit UI yet

Risk:

- clinic owners and support staff cannot easily review who changed what

Recommended next step:

- create a simple read-only audit timeline for pets, visits, appointments, preventive records, and staff actions

### 9.3 Production operations

Current state:

- local development and demo flows exist

Risk:

- wider rollout needs reliable hosting, backups, monitoring, and secrets management

Recommended next step:

- define a minimal production deployment checklist before the first real paid clinic rollout

### 9.4 Security hardening

Current state:

- authentication and security foundations exist, but review notes identify work still needed around session storage, login protection, and permissions

Risk:

- patient and owner information requires careful handling before broader adoption

Recommended next step:

- prioritize login rate limiting, session hardening, permission checks, and data-access reviews

### 9.5 Commercial validation

Current state:

- product value is clear, but willingness to pay has not yet been proven through a live customer

Risk:

- building too much before confirming the buying motion

Recommended next step:

- run one clinic pilot with a clear commercial offer and success criteria

---

## 10. Recommended next roadmap

### Next 30 days: make the product pilot-safe

Priority work:

- owner-consent hardening for shared pet linking
- simple audit history UI
- staff login rate limiting and core security fixes
- mobile workflow polish for front-desk and clinic use
- clearer shared-record labels during pet creation and linking
- pilot onboarding checklist

Business goal:

- make VetCard safe and credible enough for one controlled clinic pilot

### Next 60 days: run a real clinic pilot

Priority work:

- onboard one clinic or branch
- start with new and active patients
- run daily appointment, visit, and preventive care workflows
- capture staff feedback
- measure lookup time, follow-up handling, and appointment workflow usage
- refine screens based on real staff behavior

Business goal:

- prove that VetCard creates operational value in a live clinic setting

### Next 90 days: convert learning into a sellable package

Priority work:

- finalize pilot pricing and monthly subscription model
- prepare implementation package and onboarding materials
- define support process
- improve production deployment and backup process
- decide whether to focus first on single-branch clinics, multi-branch clinics, or owner QR sharing

Business goal:

- move from custom pilot to repeatable sales offer

---

## 11. Suggested pilot offer

The first commercial offer should be simple and low-friction.

### Pilot package

Scope:

- clinic setup
- owner/admin account setup
- staff accounts
- pet records
- appointments and calendar
- visit records
- preventive care reminders
- basic onboarding
- pilot support period

Recommended rollout:

- week 1: setup, training, workflow alignment
- weeks 2-5: live pilot with new and active patients
- week 6: review, pricing decision, and rollout plan

Suggested commercial structure:

- one-time setup fee
- monthly software fee after pilot
- optional assisted migration fee for paper records

The exact pricing can be adjusted based on the first clinic's size, support needs, and whether this is a friendly pilot or a formal customer.

---

## 12. Success metrics for the pilot

The pilot should be measured with practical business and workflow metrics.

Recommended metrics:

- number of active pets created or linked
- number of appointments created
- number of visits recorded
- number of preventive care items recorded
- staff-reported record lookup time
- number of missed or overdue follow-ups surfaced
- number of duplicate records avoided or merged through linking
- weekly active staff users
- clinic owner satisfaction after 30 days
- willingness to continue as a paid subscription

The most important question is not whether every feature exists. The most important question is whether the clinic would be disappointed to lose the workflow after using it.

---

## 13. Business positioning

VetCard should be positioned as:

> A digital pet record and clinic workflow platform that helps veterinary clinics move from paper records to searchable, shared, owner-connected pet health records.

Short version:

> VetCard helps clinics manage pet records, appointments, visits, and preventive care while giving owners a path to access and share their pet's history.

Avoid positioning VetCard only as:

- a vaccine tracker
- a generic appointment calendar
- a simple CRM
- a pet owner app only

The strongest positioning is the combination of clinic workflow plus shared pet identity.

---

## 14. Recommended immediate decisions

The business should decide these before the first serious pilot:

1. **Target first customer**
   - choose one friendly clinic or branch that is willing to test the workflow with real operations

2. **Pilot pricing**
   - decide whether the first pilot is free, discounted, or paid

3. **Pilot scope**
   - keep the first pilot focused on pet records, appointments, visits, and preventive care

4. **Consent model**
   - decide whether the next step is staff-confirmed consent with audit trail or full OTP consent

5. **Production path**
   - decide the minimum hosting, backup, and support setup required before live clinic data is used

---

## 15. Bottom line

VetCard has crossed the first major threshold: it is no longer only an idea. It is a working MVP with a clear business problem, visible product value, and a differentiated shared-record model.

The product is ready for demos and close to a controlled pilot. It is not yet ready for broad production rollout.

The next business move should be disciplined: harden the highest-risk parts, pilot with one clinic, measure actual workflow value, then package the product into a repeatable clinic subscription offer.
