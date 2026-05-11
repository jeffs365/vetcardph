# VetCard business and operations capabilities

## Purpose

This document describes VetCard in **business and operational terms** rather than technical terms.

It is intended for:

- clinic owners
- branch managers
- operations leads
- implementation discussions
- proposal and demo conversations

Use this document when the goal is to explain **what the system can do for a clinic today**, how it supports daily workflow, and where its current boundaries are.

## Executive summary

VetCard is a clinic workflow system for veterinary operations. It helps clinics move away from paper-heavy record handling by giving staff a single place to manage:

- pet and owner records
- appointments and calendar workflow
- visit documentation
- preventive care history and reminders
- clinic team access

The current product is especially useful for clinics that want:

- faster record retrieval
- clearer follow-up handling
- better day-to-day schedule visibility
- more structured clinical documentation
- cleaner cross-clinic continuity for shared pet records

## What the system can do today

## 1. Clinic workspace and staff access

Each clinic operates inside its own workspace.

Current capabilities:

- clinic registration and owner account setup
- secure sign-in for clinic users
- clinic-scoped staff roles
- team management by the clinic owner/admin
- clinic settings and account/security management

Operational value:

- keeps staff access organized by clinic
- gives owners/admins control over who can use the system
- supports basic internal accountability and day-to-day administration

## 2. Pet and owner record management

VetCard supports structured pet profiles linked to owner information.

Current capabilities:

- create new pet profiles
- edit pet profiles
- attach owner details to each pet
- store pet photos
- search pets by pet name, owner name, or mobile number
- normalize owner mobile numbers so lookup is more reliable

Operational value:

- reduces time spent searching through manual records
- improves consistency of owner contact data
- makes the pet profile the central point for daily workflow

## 3. Shared pet records across clinics

VetCard now supports a shared-record model for pets and owners.

Current capabilities:

- shared pet identity across clinics
- shared owner identity across clinics
- explicit **Link Pet Profile** workflow
- cross-clinic lookup by owner phone number
- clinic access is linked intentionally rather than automatically exposed
- privacy-safe labels such as **Recorded elsewhere** and **Completed elsewhere**

Operational value:

- supports continuity when a pet visits another clinic
- reduces duplicate pet profiles
- allows clinics to work with shared medical history while still protecting clinic privacy

Important current rule:

- another clinic does **not** automatically see every pet
- that clinic must link the pet into its own workspace through the current access flow

## 4. Home and daily operations view

The Home page is designed to help staff start the day quickly.

Current capabilities:

- today overview
- urgent follow-up items
- quick-action shortcuts
- today’s schedule preview
- clinic snapshot counts
- direct actions such as:
  - open calendar
  - find pet
  - link pet profile
  - create a new appointment
  - create a new pet profile

Operational value:

- gives staff an action-first starting screen
- highlights missed or overdue work quickly
- reduces navigation friction for common tasks

## 5. Appointment and calendar workflow

VetCard supports clinic-local appointment handling.

Current capabilities:

- create appointments
- edit appointments
- view appointment details
- view appointments on a calendar
- mark appointments as scheduled, completed, cancelled, or missed
- require confirmation before cancellation
- keep appointment notes separate from visit follow-up notes

Operational value:

- improves schedule visibility
- supports no-show handling through the **Missed** status
- makes it easier for the clinic to separate booking workflow from actual clinical documentation

## 6. Visit documentation

VetCard supports structured visit records for clinical encounters.

Current capabilities:

- create visits
- edit visits created by the current clinic
- capture reason for visit, findings, treatment, diagnosis, and follow-up notes
- show visit history on the pet profile
- share visit history across clinics that have access to the pet

Operational value:

- gives staff a more structured consultation record
- keeps visit history attached to the pet instead of scattered across notes or paper
- improves continuity of care for repeat visits

## 7. Preventive care and follow-up workflow

VetCard supports preventive care as a more flexible care-schedule workflow instead of a narrow fixed-category tracker.

Current capabilities:

- view preventive care history for a pet
- create preventive care records
- support one-time care items
- support recurring care items
- support flexible cadence such as every 2 weeks or every 3 months
- track due workflow per care type
- keep due workflow clinic-local while preserving shared medical history
- mark outside-clinic completion using privacy-safe labeling

Operational value:

- helps clinics manage follow-up care more clearly
- supports a broader range of real clinic workflows, not only simple vaccine/deworming buckets
- avoids leaving local due items overdue forever when care was completed elsewhere

## 8. Pet profile as the main working screen

The pet profile is now one of the main operational screens.

Current capabilities:

- pet summary and owner contact details
- quick owner call/text actions
- next appointment / last visit / last preventive snapshots
- upcoming appointment section
- medical history tabs with counts
- shared-history context shown inline
- direct actions to:
  - record a new visit
  - schedule an appointment
  - open preventive care

Operational value:

- gives staff one central working page per patient
- makes “what happened last?” and “what needs to happen next?” easier to answer quickly

## 9. Search and retrieval

VetCard is designed to help staff retrieve records quickly.

Current capabilities:

- searchable pet list
- owner-phone-based retrieval
- direct link flow for existing shared pets
- list cards that surface useful scan details such as:
  - owner
  - phone
  - pet color
  - age
  - weight
  - shared-record indicator

Operational value:

- reduces lookup time at the front desk or during intake
- supports faster matching when a pet may already exist in the system

## 10. Team and account administration

VetCard includes basic clinic administration surfaces.

Current capabilities:

- account overview
- clinic settings
- password/security screen
- clinic team list
- add team member flow
- feedback screen for product input

Operational value:

- gives clinics a basic internal operating layer beyond patient records alone
- supports staff setup and simple clinic administration in the same system

## Best-fit business use cases right now

VetCard is currently a good fit for clinics that want to improve:

1. **Patient record access**
   - faster search and cleaner pet profiles
2. **Daily clinic workflow**
   - appointments, visits, and follow-up handling
3. **Preventive care tracking**
   - due management and recurring care reminders
4. **Repeat-patient continuity**
   - clearer history over time
5. **Cross-clinic continuity**
   - shared pet history with controlled linking and privacy-safe labels

## Current boundaries and limitations

The product is already useful for operations, but some items are still not fully developed.

Current limits:

- owner approval for cross-clinic linking is still an in-clinic confirmation step, not a full OTP/client approval flow
- audit history exists in the backend but not yet as a strong user-facing audit UI
- production-readiness work is still incomplete
- some advanced operational areas are not yet included, such as:
  - billing
  - inventory
  - receipts
  - advanced reporting
  - enterprise-grade infrastructure/monitoring

## Suggested business positioning

When presenting VetCard in a business or operations discussion, the strongest positioning is:

> VetCard helps a clinic move from paper-heavy, fragmented workflow toward a more searchable, structured, and operationally manageable system without requiring an all-at-once transformation.

That is especially true for clinics that need:

- practical day-to-day workflow support
- clearer patient follow-up
- better schedule visibility
- a path toward multi-clinic record continuity

## Related docs

- `docs/current-state.md` — technical and product snapshot of the live system
- `docs/future-state-shared-records.md` — direction for the remaining shared-record roadmap
- `docs/actionable-gaps.md` — build-ready backlog of current gaps and next priorities
