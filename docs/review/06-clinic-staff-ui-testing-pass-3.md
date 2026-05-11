# Clinic Staff UI Testing Pass 3

Date: 2026-05-04
Environment: local app at `http://127.0.0.1:8090`, backend at `http://127.0.0.1:3001`
Account: `owner@demo.vetcard.app`

## Scope

This was a confidence pass after the pass-2 fixes. It focused on:

- Cancelled appointment recovery from the patient profile
- Destructive actions on disposable QA data
- Quick route smoke checks for main clinic screens and forms

## Disposable Test Data

Created and then removed:

- Pet: `QA Pass3 Delete 75395495`
- Visit: `QA Pass3 visit 75395495`
- Care item: `QA Pass3 care 75395495`

The user confirmed all development data is disposable before destructive actions were completed.

## Results

| Workflow | Result | Notes |
| --- | --- | --- |
| Visit deletion | Pass | Visit detail showed a permanent delete confirmation. `Yes, delete` removed the visit and returned to the pet profile with an empty visit state. |
| Care item deletion | Pass | Care schedule showed a permanent delete confirmation. `Yes` removed the care item and showed the empty care state. |
| Remove pet from clinic | Pass | Pet profile showed a remove confirmation. `Yes, remove` returned to search, and the removed QA pet no longer appeared in results. |
| Completed appointment edit guard | Pass | Completed appointment detail no longer showed `Reschedule`; API guard was verified in pass 2 remediation. |
| Main route smoke check | Pass with note | Home, Pets, Pet Profile, Appointment Detail, Visit Form, and Care Form all loaded. Browser console still contains an old HMR error from a previous `8081` session; no new app-blocking error appeared during this pass. |

## Findings

## Remediation Status

| Finding | Status | Verification |
| --- | --- | --- |
| P2 - Cancelled appointments are not recoverable from the patient profile | Fixed | Pet detail now returns all current-clinic appointments. Pet Profile shows non-scheduled appointments in `Appointment History`; the cancelled appointment opens its detail page and exposes `Reschedule`. |

### P2 - Cancelled appointments are not recoverable from the patient profile

The pass-2 remediation changed the cancel dialog copy to say cancelled appointments can be reopened from the patient profile. In pass 3, the cancelled appointment `QA Pass2 status appointment 73234462` did not appear on the pet profile. The profile only showed scheduled appointments, visits, and care history.

Risk: staff can cancel an appointment, lose it from the active calendar, and have no visible recovery path unless they kept the appointment detail page URL open.

Suggested fix: add a historical/archived appointment section on the pet profile, or a Calendar filter for cancelled/completed appointments. Until then, avoid telling users they can reopen cancelled appointments from the pet profile.

## Recommendation

The clinic-staff MVP flows are now solid enough to move into broader QA. No blocking clinic-staff issue remains from this pass.
