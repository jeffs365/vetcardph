# Clinic Staff UI Testing Pass 2

Date: 2026-05-04
Environment: local app at `http://127.0.0.1:8090`, backend at `http://127.0.0.1:3001`
Account: `owner@demo.vetcard.app`

## Scope

This pass focused on clinic-staff regression and deeper workflow coverage after the first round of fixes.

Covered:
- Appointment default time regression
- Pet profile edit
- Appointment-linked visit creation and visit edit
- Appointment completion after recording a linked visit
- Appointment cancellation flow
- Preventive/care item creation and edit
- Link existing pet profile lookup
- Search and search filters

Skipped:
- Permanent deletes, including visit deletion, preventive record deletion, and removing a pet from the clinic. Those are destructive data actions and should be tested with explicit confirmation on disposable records.

## Test Data Created

- Pet: `QA Pass2 73234462`
- Owner: `QA Pass2 Owner 73234462`
- Appointment: `QA Pass2 appointment 73234462`
- Visit: linked to the appointment above
- Care item: `QA recurring care updated 73234462`
- Status-test appointment: `QA Pass2 status appointment 73234462`

## Regression Results

| Area | Result | Notes |
| --- | --- | --- |
| Appointment default time | Pass | Opening `/appointments/new?date=2026-05-04` defaulted to a future time slot, `14:00`, rather than an already-past morning time. |
| Pet birth date display | Pass | Existing fixed QA record still displays an age from birth date rather than `Unknown age`; new pass-2 pet displayed `4 yr 3 mo`. |
| Visit attending staff default | Pass | New visit linked to an appointment defaulted to `Dr. Lara Santos`, not the clinic owner. |
| Search filter button accessibility | Pass | Filter button now exposes `Show search filters` / `Hide search filters` and expanded state. |
| Appointment detail action placement | Pass | Appointment detail actions remain in the page flow below the patient card. |

## Workflow Results

| Workflow | Result | Notes |
| --- | --- | --- |
| Edit pet profile | Pass | Updated color from `Brown` to `Golden` and weight from `12.4 kg` to `13.2 kg`; profile reflected both changes. |
| Create appointment-linked visit | Pass | Appointment context was prefilled, date matched appointment date, reason copied from appointment, and save created a visit. |
| Appointment completion from visit | Pass | After saving the linked visit, the appointment detail showed `Completed`. |
| Edit visit | Pass | Updated follow-up notes and confirmed the visit detail reflected the change. |
| Create recurring care item | Pass | Saved recurring care, displayed `Every 1 month`, and showed the next due date. |
| Edit recurring care item | Pass | Updated care name and cadence from `1 month` to `2 months`; history reflected both changes. |
| Link pet profile lookup | Pass | Phone lookup found existing profiles and correctly marked already-linked profiles. |
| Cancel appointment | Pass | Cancel dialog appeared, `Yes, cancel` marked the record `Cancelled`, and the appointment disappeared from the active calendar day list. |

## Findings

## Remediation Status

| Finding | Status | Verification |
| --- | --- | --- |
| P1 - Completed appointments can still be edited/rescheduled | Fixed | Completed appointment detail no longer shows `Reschedule`; `PUT /appointments/:appointmentId` now returns `409` with `Completed appointments cannot be edited.` |
| P2 - Cancelled appointment recovery is not discoverable | Partially fixed | Cancel dialog copy now says cancelled appointments can be reopened from the patient profile, which matches the current UI. A dedicated cancelled/archived appointment list remains a future enhancement. |
| P2 - Several header icon buttons/links have no accessible name | Fixed | Link-pet, pet-edit, care-record, and visit form header controls now expose specific accessible names. |
| P2 - Search filter selects are unlabeled | Fixed | Filter selects now expose `Filter by type`, `Filter by breed`, `Filter by color`, `Filter by sex`, and `Filter by age`. |
| P3 - Link profile result actions are ambiguous when multiple pets are found | Fixed | Link/open profile buttons now include the pet name in their accessible label. |
| P3 - Care recurrence choice does not expose selected state | Fixed | Recurrence option buttons now expose pressed state. |

### P1 - Completed appointments can still be edited/rescheduled

After recording a visit from a scheduled appointment, the appointment correctly became `Completed`. The completed appointment detail still exposed a `Reschedule` link to `/appointments/:appointmentId/edit`, and the edit form allowed changing booking details. In the test, the reason was changed to `QA Pass2 completed rescheduled 73234462` and saved while the appointment remained `Completed`.

Risk: completed appointment history can be rewritten after the clinical visit is recorded. That can make the appointment record disagree with the linked visit and weaken audit/history trust.

Suggested fix: hide `Reschedule` for `COMPLETED` appointments, or replace it with a clearly named correction action. Backend `PUT /appointments/:appointmentId` should also reject normal edits for `COMPLETED` appointments unless the product intentionally supports audited corrections.

### P2 - Cancelled appointment recovery is not discoverable

The cancel dialog says the appointment is removed from the active schedule and can still be opened later if rescheduling is needed. After cancellation, the appointment no longer appears on the calendar day list, and there is no obvious cancelled/archived appointment list in the UI.

Risk: staff may cancel by mistake and then have no visible path to recover or reschedule the cancelled appointment unless they still have the detail page open.

Suggested fix: add a cancelled appointment filter/history section in Calendar, or change the dialog copy to match the current behavior.

### P2 - Several header icon buttons/links have no accessible name

Several form headers still expose icon-only controls as unnamed elements in the accessibility tree:

- `Link Pet Profile` header back button
- `Edit Pet` header back button
- `Record Care Item` / `Edit Care Record` header back button
- `New Visit` / `Edit Visit` header close link

Risk: screen-reader users hear only "button" or "link", and automated QA has to rely on fragile structure.

Suggested fix: add specific labels such as `aria-label="Back to pet profile"`, `aria-label="Close care record form"`, or `aria-label="Cancel visit form"`.

### P2 - Search filter selects are unlabeled

The search filter panel exposes five comboboxes with no accessible names. Visually they map to type, breed, color, gender, and age, but the DOM snapshot only shows anonymous `combobox` elements.

Risk: screen-reader users cannot tell what each filter controls. This also makes keyboard/automated testing more brittle.

Suggested fix: pair each select with a real label or add explicit `aria-label` values, for example `Filter by type`, `Filter by breed`, `Filter by color`, `Filter by sex`, and `Filter by age`.

### P3 - Link profile result actions are ambiguous when multiple pets are found

The link-profile lookup returned three pet cards, each with an action named `Open Profile`. The buttons are visually separated by card, but their accessible names are identical.

Risk: assistive tech users cannot distinguish which profile each button opens without navigating surrounding content carefully.

Suggested fix: include the pet name in the action label, for example `aria-label="Open Bruno profile"` while keeping visible text as `Open Profile`.

### P3 - Care recurrence choice does not expose selected state

The care form presents `One time` and `Recurring` as visual buttons. The selected state is visible through styling, but the controls do not expose a radio/pressed state in the accessibility tree.

Risk: keyboard and screen-reader users may not know whether the care item is one-time or recurring.

Suggested fix: implement the pair as a radio group, or add `aria-pressed` with clear labels.

## Follow-Up Recommendation

Fix the P1 completed-appointment edit path first because it affects record integrity. Then batch the accessibility fixes together across form headers, filter controls, link-profile actions, and recurrence choices.
