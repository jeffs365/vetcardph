# Clinic Staff UI Testing Pass — VetCard
> Reviewed 2026-05-04 11:14 +08  
> Scope: clinic staff only, mobile-width browser pass against local web + API.

## Test Environment

- Web: `http://127.0.0.1:8090`
- API: `http://127.0.0.1:3001` through Vite `/api` proxy
- Demo clinic login: `owner@demo.vetcard.app / password123`
- Browser viewport: mobile app canvas in Codex in-app browser
- QA record created:
  - Pet: `QA Clinic Flow 1777864242361`
  - Owner: `QA Owner 1777864242361`
  - Phone: `09170000001`

## Flows Tested

| Flow | Result | Notes |
|---|---:|---|
| Clinic staff sign-in | Pass | Demo credentials were prefilled and login routed to `/home`. |
| Home dashboard | Pass | Dashboard, missed appointment alert, quick actions, and bottom nav rendered. |
| Add pet record | Pass with finding | Record saved and routed to pet profile. Birth date did not appear after save. |
| Pet search | Pass with finding | Searching by exact QA pet name returned one result. Filter icon lacks accessible name. |
| Pet profile | Pass with findings | Owner contact, appointment, visit, and care summaries updated after new records. Long pet names truncate. |
| Record visit | Pass with finding | Visit saved and detail page rendered. Attending staff default may be misleading. |
| Schedule appointment | Pass with finding | Appointment saved and appeared on calendar. Default time made it immediately overdue. |
| Appointment detail | Pass with finding | Patient and actions were available, but action buttons were separated by a large blank area. |
| Record one-time care item | Pass | Care item saved and updated latest-care summary on pet profile. |
| Account / quick add | Pass | Account links render; quick add sheet opens with New Pet, Link Pet, and Add Appointment. |

## Findings

### Remediation Status

Updated 2026-05-04:

| Finding | Status | Notes |
|---|---:|---|
| Birth date entered during pet creation is not reflected after save | Fixed | New QA pet saved with `01/15/2024` now displays `2 yr 3 mo`. |
| Scheduling an appointment for today defaults to an already-overdue time | Fixed | Web form now defaults today's appointments to the next future half-hour slot; API rejects past appointment times. |
| Visit form defaults attending staff to the clinic owner | Fixed | New visits now prefer the current clinical staff member, or another veterinarian/assistant, instead of defaulting to owner/admin. |
| Search filter icon button has no accessible name | Fixed | Filter toggle now exposes `Show search filters` / `Hide search filters` with `aria-expanded`. |
| Appointment detail actions are detached by a large blank gap | Fixed | Appointment actions now render in the normal page flow directly after the patient card. |
| Long pet names truncate in the pet profile hero card | Fixed | Pet profile hero title now allows two lines before truncation. |

### 1. Birth Date Entered During Pet Creation Is Not Reflected After Save

**Severity:** High  
**Area:** New Pet Profile → Pet Profile / Search Results

**Repro:**
1. Go to `/pets/new`.
2. Fill required fields and enter `01/15/2024` in Birth Date.
3. Save the record.
4. View the saved pet profile and search result.

**Observed:** The saved pet shows `Unknown age` on the profile and search card.  
**Expected:** The pet profile should show an age derived from the entered birth date.

**Why it matters:** Birth date/age is core medical context. Staff may assume age is unknown even though it was entered.

**Recommendation:** Verify the Add Pet payload, API serializer, and age derivation. If the API rejects or ignores `birthDate`, surface a validation error instead of saving silently.

---

### 2. Scheduling an Appointment for Today Defaults to an Already-Overdue Time

**Severity:** Medium  
**Area:** Add Appointment / Calendar / Appointment Detail

**Repro:**
1. From a pet profile, choose Schedule Appointment.
2. Leave the default date/time as today at `09:00`.
3. Save the appointment later in the day.

**Observed:** The appointment is created successfully, then immediately appears as `Overdue`.  
**Expected:** The default time should be the next reasonable clinic slot, or the form should warn when creating an appointment in the past.

**Recommendation:** Default to the next future slot when `date === today`, or block past date/time combinations with a clear validation message.

---

### 3. Visit Form Defaults “Attending Staff” to the Clinic Owner

**Severity:** Medium  
**Area:** Record Visit

**Repro:**
1. Log in as `Demo Owner`.
2. Open Record New Visit from a pet profile.
3. Inspect the Attending Staff field.

**Observed:** `Demo Owner` is selected by default and the saved visit detail shows `Attended by Demo Owner · Owner`.  
**Expected:** For a clinical visit, the default should either be blank or prefer a veterinarian/clinical staff member when available.

**Why it matters:** This can create inaccurate medical attribution if staff save quickly without changing the dropdown.

**Recommendation:** Default to blank with a required selection, or default only when the current user has an appropriate clinical role.

---

### 4. Search Filter Icon Button Has No Accessible Name

**Severity:** Medium  
**Area:** Pet Search

**Repro:**
1. Go to `/pets`.
2. Inspect the search controls accessibility tree.

**Observed:** The filter/settings icon appears as an unlabeled `button`.  
**Expected:** The button should be exposed as something like `Filter search results`.

**Recommendation:** Add `aria-label="Filter search results"` or visible text for the icon-only button.

---

### 5. Appointment Detail Actions Are Detached by a Large Blank Gap

**Severity:** Low / Medium  
**Area:** Appointment Detail

**Repro:**
1. Open an appointment detail page.
2. Scroll below the patient card.

**Observed:** There is a large empty vertical space before the action buttons (`Mark Missed`, `Cancel`, `Reschedule`, `Record Visit`).  
**Expected:** Actions should appear directly after the patient card or use a clearly sticky footer treatment.

**Why it matters:** On mobile, the blank gap makes the actions feel missing and forces extra scrolling during a high-frequency workflow.

**Recommendation:** Reduce the spacer/flex behavior around the action section, or convert the actions into a sticky bottom action bar above the bottom nav.

---

### 6. Long Pet Names Truncate in the Pet Profile Hero Card

**Severity:** Low  
**Area:** Pet Profile

**Observed:** Long pet names are truncated in the profile hero card, even though the full name appears in some headings and links.  
**Expected:** Common names are fine, but duplicate-heavy clinics may need the full name visible or a secondary owner identifier nearby.

**Recommendation:** Allow a second line before truncation, or show the full name in a stable detail row under the hero title.

## Positive Notes

- The main clinic lifecycle is cohesive: create pet → record visit → schedule appointment → add care item → search pet → revisit profile.
- Success toasts are clear and consistently placed.
- Pet profile summary cards update immediately after new appointments, visits, and care items.
- Owner contact actions normalize the local phone into usable `sms:` and `tel:` links.
- The quick add sheet is discoverable and contains the right core actions for general navigation.

## Suggested Next Pass

1. Re-test validation and error states for empty/invalid forms.
2. Test edit flows for pet, visit, appointment, and preventive care.
3. Test link-pet workflow with existing shared owner mobile numbers.
4. Test destructive actions separately: mark missed, cancel appointment, delete visit, remove pet from clinic.
