# VetCard actionable gaps

## Purpose

This document turns the current known gaps into a buildable backlog for the next phase of VetCard.

It focuses on work we can ship **now** within the current web MVP and codebase. It intentionally favors product, workflow, and developer-experience gaps over larger infrastructure programs.

## Current progress

The original first sprint is now complete in the repo:

- canonical `/pets` routing is in place, with `/search` kept as a redirect
- visit edit is implemented
- preventive/shared-record visibility has been improved on the active record surfaces
- the placeholder test has been replaced with real workflow coverage

The next workflow slice is also now complete in the repo:

- preventive care is now the primary staff-facing workflow, with a generalized pet preventive page and generic record form
- preventive due workflow now tracks per care type instead of only per category
- staff can now record free-text care items with structured cadence such as every 2 weeks or every 3 months, including follow-up reminders
- vaccine/deworming-specific pages, routes, and hard-coded categories have been removed from the active staff workflow
- appointments now support an explicit missed status
- appointment booking notes no longer leak into visit follow-up notes
- workflow tests now cover generalized preventive and missed-appointment behavior

The remaining active backlog starts with owner-consent hardening and audit visibility.

## What is in scope now

- web and API workflow gaps already visible in the current product
- cleanup of legacy routes and leftover surfaces
- missing CRUD flows that are already partially supported by the backend
- shared-record UX improvements
- quality work that helps the next build cycle move faster

## What is not the immediate focus

These still matter, but should be handled as a later production-readiness track unless they become urgent:

- backup and restore strategy
- production secret management
- operational monitoring and alerting
- non-local file storage migration
- full security review

## Suggested implementation order

1. Canonicalize Pets routing and remove legacy leftovers
2. Add visit edit flow
3. Improve preventive workflow maintenance
4. Strengthen shared-record context across the UI
5. Harden owner-consent flow for cross-clinic linking
6. Add audit history UI
7. Raise test coverage around current critical workflows
8. Clean up developer-facing documentation

---

## 1. Canonicalize Pets routing and remove legacy leftovers

**Status:** Completed.

### Why this matters

The UI already uses **Pets** as the product language, but the route structure still centers on `/search`. That makes the app harder to reason about and leaves old surfaces behind.

### Build now

- make `/pets` the canonical list/search route
- redirect `/search` to `/pets`
- rename or realign `SearchPage.tsx` only if it reduces confusion without creating broad churn
- remove `Due.tsx` if Calendar has fully replaced it
- update navigation helpers and return-path logic to use the canonical route

### Definition of done

- bottom nav opens `/pets`
- all links, redirects, and return states use `/pets`
- no user-facing flow depends on the old `/search` route
- dead `Due` surface is removed or explicitly archived

---

## 2. Add visit edit flow

**Status:** Completed.

### Why this matters

The backend already supports `PUT /visits/:visitId`, but the frontend only supports create and detail. This is a missing workflow, not a missing platform capability.

### Build now

- add an edit action from `VisitDetail`
- reuse `AddVisit` as an edit form or split a dedicated edit page if cleaner
- load existing visit data into the form
- preserve current back-navigation behavior
- invalidate pet, visit, dashboard, and calendar queries after save

### Definition of done

- staff can edit a visit they can already view
- edited diagnosis, notes, treatment, and follow-up appear correctly in pet history and calendar flows
- the edit path feels consistent with appointment edit and pet edit flows

---

## 3. Improve preventive workflow maintenance

**Status:** Staff workflow generalized, free-text care reminders shipped, and due tracking improved; advanced maintenance/audit actions remain open.

### Why this matters

The shared-record model is already in place, and the staff-facing flow now centers on a generalized care schedule with free-text reminder capture. The remaining gap is not basic capture anymore; it is deeper maintenance and auditability around due-work state.

### Build now

- add maintenance actions for preventive schedules where needed
- decide whether staff need explicit actions such as:
  - mark as superseded
  - resolve or reopen a due item
  - inspect why an item left the active due list
- expose richer due-state context on calendar-adjacent and audit surfaces

### Definition of done

- clinic staff can understand why a due item is open, completed elsewhere, or no longer actionable
- preventive workflow state is visible enough to reduce confusion during follow-up
- local clinic workflow still stays separate from shared medical truth

---

## 4. Strengthen shared-record context across the UI

**Status:** Initial visibility pass completed; broader intake/linking guidance remains open.

### Why this matters

The backend and data model already support shared records, but the UI still relies on users inferring what is local vs shared in some places.

### Build now

- add clearer shared-history labels on more detail and list screens
- make “recorded here”, “recorded elsewhere”, and “completed elsewhere” easier to scan
- add stronger guidance during pet creation when a likely existing shared pet should be linked instead of recreated
- review pet profile, add pet, link pet, and search results for missing context

### Definition of done

- staff can tell whether a record belongs to the current clinic workflow or shared history
- linking vs creating is clearer during pet intake
- the cross-clinic model feels intentional, not incidental

---

## 5. Harden owner-consent flow for cross-clinic linking

### Why this matters

Current owner consent is only an in-clinic confirmation checkbox. That is acceptable for a working MVP, but it is the weakest part of the shared-record model.

### Build now

- define the next consent step before full OTP work
- choose one incremental path:
  1. explicit access request flow stored in the system
  2. staff-confirmed consent with stronger audit trail
  3. OTP-based owner approval
- at minimum, store more explicit consent evidence and timing
- add UI states for pending, approved, denied, or expired access if moving beyond the simple checkbox

### Definition of done

- shared pet linking has a stronger, traceable consent model
- staff can explain the approval status of a link request
- the new flow still works in a fast clinic setting

### Note

If delivery speed is the priority, start with **staff-confirmed consent plus audit trail**, then move to OTP later.

---

## 6. Add audit history UI

### Why this matters

Audit entries already exist in the backend and are created in many important workflows, but there is no meaningful UI for them yet.

### Build now

- add a read-only audit history surface for owners or admins
- start with the highest-value entities:
  - pets
  - appointments
  - visits
  - preventive records
  - staff/password actions
- keep the first version simple: timeline, actor, action, timestamp, summary

### Definition of done

- important actions are visible without querying the database directly
- owners/admins can review who changed what at a useful level of detail
- audit UI supports support/debugging conversations

---

## 7. Raise test coverage around critical workflows

### Why this matters

The app is in a much better place than the original placeholder-test state, but coverage is still selective relative to the workflow complexity now in the repo.

### Build now

- extend the existing workflow coverage around:
  - pet search and filter behavior
  - add pet vs link pet decision path
  - appointment create/cancel/missed/reschedule flow
  - visit create and visit edit flow
- care schedule filtering and cadence-driven due behavior
- add focused backend route tests only if test scaffolding already exists or can be added with low churn

### Definition of done

- the most failure-prone user journeys have coverage
- route cleanup and shared-record changes can ship with more confidence
- tests document expected behavior, not just implementation details

---

## 8. Clean up developer-facing documentation

### Why this matters

The repo’s best product context lives in `docs/`, but the top-level README is still mostly empty. That slows onboarding and makes local setup more fragile than necessary.

### Build now

- replace the placeholder README with:
  - project overview
  - monorepo structure
  - local setup steps
  - demo login details
  - key scripts
  - shared-record model summary
- link the most useful docs from the README

### Definition of done

- a new developer can run the app and understand the repo without reading the code first
- the current-state and backlog docs are discoverable from the repo root

---

## Recommended first sprint

This sprint is now complete:

1. canonical `/pets` routing cleanup
2. visit edit flow
3. preventive workflow visibility improvements
4. test coverage for those changes

That sequence removed the most immediate workflow gaps and gives the next round of shared-record work a safer base.
