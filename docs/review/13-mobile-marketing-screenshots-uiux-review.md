# Mobile Marketing Screenshots — UI/UX Review

**Date:** 2026-05-11
**Scope:** 10 mobile screenshots in `marketing-assets/screenshots/mobile/`
**Reviewer:** Claude (visual review only — no code inspection)

---

## Summary

Overall the product reads well: the "index card" metaphor is clear, typography hierarchy is confident, the teal/cream palette feels clinical without being sterile, and the dual-portal personas (clinic staff vs pet owner) are visually distinguished by accent color (teal vs orange).

Recurring issues across the deck:

- Duplicate signaling of the same fact in 2–3 places per screen
- Truncation on primary content (titles, search placeholder, tabs)
- Inconsistent tap-target styling and number/date formatting
- Several likely WCAG AA contrast failures
- Zero values rendered with the same weight as urgent values

---

## Screen-by-screen findings

### 1. Landing page (`landing-home.png`)

**Works:**
- Clear value prop ("any pet record in seconds, not minutes")
- Dual "I am Clinic Staff / I am Pet Owner" split is the right primary decision to surface

**Improve:**
- Hero photo is generic stock — a real Filipino clinic shot (PH GTM target) would build trust faster
- "New clinic? Register in minutes" is a text link under a primary button — promote to a secondary outlined button for parity with "Clinic Staff Login"
- "MADE FOR VETERINARY CLINICS" badge above the H1 doesn't have a parallel "FOR PET PARENTS" badge for the owner persona
- No social proof above the fold (testimonial, clinic count, pilot logo)

---

### 2. Clinic dashboard (`clinic-dashboard.png`)

**Works:**
- "Today at a glance" KPI row is scannable
- "Needs attention" surface with explicit counts is exactly what a busy receptionist needs

**Improve:**
- KPI tiles (Today/Next/Follow/Care) use identical visual weight even when values are urgent vs zero — color-code the number
- "Needs attention" parent card + 3 child rows is redundant; collapse or make expandable
- "Schedule >" pill top-right is visually similar to inactive header link — promote or remove
- QR icon next to search bar is unlabeled — add tooltip or explicit "Scan" affordance

---

### 3. Pet search (`clinic-pet-search.png`)

**Works:**
- Clean cards; breed/age/sex/color/weight chips give enough at a glance
- "Add New Pet" + "Link Pet" both top-level is the right move

**Improve:**
- All results look identical in priority — no recency, no "recently active" sort, no "has open care item" badge
- Search placeholder "Search pet, owner, or mot..." is truncated — shorten or wrap
- "SEARCH RESULTS · 6" but only 4 visible — add scroll cue or count footer
- Phone numbers shown raw (`09192345678`) — format as `0919 234 5678`

---

### 4. Calendar / followups (`clinic-calendar-followups.png`)

**Works:**
- Week strip with dots-for-load indicators is clean
- 4-tile KPI row (Total/Overdue/Visits/Appts) well-targeted

**Improve:**
- "Needs action" red banner duplicates the "1 OVERDUE" tile — pick one
- "Rabies booster ..." truncated; the booster type is the whole point
- Phone-call shortcut competes visually with the chevron — give it stronger color or label "Call owner"
- "Sorted by time" + "All times in clinic time" — combine into one metadata row
- Day-strip dots lack a legend

---

### 5. Pet profile — overview (`clinic-pet-profile-overview.png`)

**Works:**
- Information-dense header without feeling crowded
- "CHECK FIRST → Review active health notes" is an excellent pre-care nudge
- Quick Record (Visit/Appt/Care Item) at the top is the right primary action set

**Improve:**
- Owner email is shown but inert — make tappable (`mailto:`)
- "Pet Record" tabs (Overview/Timeline/Vaccines/Dev…) partially cut off — add scroll affordance
- "9.2 kg" weight should include the date recorded (trends matter clinically)
- "DIGITAL HEALTH BOOKLET / Pet Record" double-label is redundant — pick one

---

### 6. Pet profile — vaccines (`clinic-pet-profile-vaccines.png`)

**Works:**
- Excellent — Product/Manufacturer/Lot/Serial/Expiry is exactly what real vaccine records need
- "Next due" highlighted at top is correct

**Improve:**
- "Next due: May 13, 2026 · Due in 5d" appears twice (banner + per-card pill) — once is enough
- "Recorded here" badge meaning is unclear to new users
- Search bar inside an already-filtered tab is overkill for typical caseloads; hide until ≥5 entries
- "Travel booster due this week" footer note lives outside any card — wrap in callout

---

### 7. Visit detail (`clinic-visit-detail.png`)

**Works:**
- Hero card with visit title + chips is well done
- Labeled fields (Attended by / Diagnosis / Visit weight) are unambiguous

**Improve:**
- "Visit Overview" subhead ("Who attended the consultation and the main medical summary…") is filler; remove
- Hero card uses a gradient background while every other card is flat — inconsistent
- "Clinical Findings" — likely the most important content — starts at the very bottom; reorder above metadata
- No "Add follow-up" or "Schedule next" action surfaced after reading a closed visit

---

### 8. Owner home (`owner-home.png`)

**Works:**
- Friendly greeting, pet carousel with dots, clear sharing primary action

**Improve:**
- Pet card uses generic paw glyph instead of the pet photo (Charlie's photo is available elsewhere)
- "CURRENT STATUS / VetCard is ready when you need to share it" is filler in prime real estate — replace with actionable info (e.g., "Rabies due in 5 days")
- "Full Profile QR" and "Emergency QR" cards look identical in weight; de-prioritize the emergency one (less common)
- Bottom nav uses an "MS" avatar — use a real photo if available

---

### 9. Owner pet profile (`owner-pet-profile.png`)

**Works:**
- The orange "Share Full Profile QR" is a confident primary action — best CTA in the deck
- Next appointment / Last visit pairing is the right at-a-glance

**Improve:**
- "SHARE VETCARD / Ready when a clinic needs it" panel does two jobs (context + action); headline is sales-speak — drop it
- "Emergency QR" outlined button has very low contrast on the peach background — likely fails WCAG AA
- 2×2 metadata grid is partially cut off — either complete above the fold or push below
- No vaccine-due warning even though clinic side flagged "Rabies due in 5d" — owners need this more than clinics do

---

### 10. Public share — Luna (`public-share-luna-record.png`)

**Works:**
- "SHARED VETCARD" header sets context immediately
- Owner contact block with one-tap call is right for a clinic receiving a shared record

**Improve:**
- No VetCard branding/logo on this screen — a clinic scanning this for the first time has no idea what product produced it
- "SHARE EXPIRES" tile has same weight as everything else; expiry is critical to a receiving clinic — promote to banner or change color
- No "Save to clinic" / "Claim a free VetCard clinic account" CTA — this is the marketing moment; missed acquisition opportunity
- Layout feels cramped vs the owner-facing view; reuse the same hero card

---

## Cross-cutting issues

1. **Duplicate signaling** — Same overdue/due-soon fact repeated in 2–3 places per screen (Calendar, Vaccines, Dashboard). Adopt a "say it once, link to detail" rule.
2. **Truncation everywhere** — "Rabies booster ...", "Search pet, owner, or mot...", "Dev…" tab, "1 missed appoint...", "Call owners or resc...". Either reflow to 2 lines for important content or shorten labels at source. Truncation on primary content is a UX bug, not a styling choice.
3. **Tap-target consistency** — Some chevrons are circled buttons, some bare. Some phone icons are filled tiles, some flat. Unify.
4. **Number/date formatting** — Phone numbers, dates, and times have inconsistent spacing/punctuation. Pick one style and enforce via a util.
5. **Bottom nav inconsistency** — Clinic has 5 tabs (Home/Pets/Add/Calendar/Account), owner has 4 (Home/Pets/Share/Account). Center "+ Add" on clinic side is an action, not a destination — convert to FAB.
6. **Zero states** — "0 NEXT", "0 VISITS" render at the same weight as non-zero values. Dim zeros.
7. **Accessibility** — peach-on-peach (Emergency QR button), orange-on-peach (CHECK FIRST badge), and white-on-light-teal (Recorded here badge) likely fail WCAG AA contrast. Run an audit.
8. **Photos vs glyphs** — Pet photos appear on clinic side and in some owner screens, but owner home shows a paw glyph. Decide once.

---

## Top 5 high-impact fixes

1. Remove duplicate "needs attention" surfaces on dashboard + calendar — reclaim a screenful of space
2. Fix all text truncation on primary content (titles, search placeholder, tabs)
3. Add a VetCard footer + clinic-acquisition CTA on the public share screen — free top-of-funnel
4. Color-code zero vs urgent numbers across all KPI tiles
5. Run a WCAG AA contrast pass — at least three buttons currently look like they'd fail
