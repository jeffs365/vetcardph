# Mobile UI Polish Review

Date: 2026-05-05
Area: mobile-first clinic, owner, and public booklet surfaces
Environment: `http://127.0.0.1:8090`

## Scope Covered

- Clinic pet profile: hero, owner card, primary actions, summary cards, appointment history, booklet tabs.
- Owner pet profile: empty-state pet, data-rich pet, QR/share actions, summary cards, booklet cards, clinic connections.
- Public full-profile share: active shared record and expired-link state.
- Owner share hub.
- Add preventive record form, including historical booklet source.
- Add visit form.

## Overall Read

The latest visual pass is moving in the right direction. The app now feels much warmer on mobile: the saved VetCard characters help the owner/public surfaces feel less clinical, the owner share actions are clearer, and the pet record cards are easier to scan.

The remaining issues are mostly conversion/usability polish rather than broken flows. For non-technical mobile users, the next improvements should reduce ambiguous tap targets, make horizontal controls more discoverable, and make share/QR flows feel less technical.

## What Is Working Well

- The pet hero cards now feel friendly without losing the clinical record context.
- Owner profile share CTAs are clearer and use the correct orange audience cue.
- Staff primary visit action now uses clinic green, which better matches the brand roles.
- Public share active view is readable on a phone and surfaces the owner contact quickly.
- The expired share state is no longer a dead end; it gives the user a path back.
- Historical booklet entries are visible in staff/public views without overwhelming the record.
- Add preventive record form is structured and understandable, even for historical booklet backfill.

## Findings

### P1 — Owner/Public Booklet Cards Look Tappable But Are Not

**Area:** Owner pet profile, public full-profile share

**Observed:** Booklet cards display a chevron on the right, which strongly implies the card opens a detail page. On owner and public share surfaces, these cards are static.

**Why it matters:** Non-technical users will tap chevrons. If nothing happens, the app feels broken even though the information is present.

**Recommendation:** Either remove the chevrons from non-interactive booklet cards, or make the cards open a simple detail view/expanded state. For now, removing the chevron is the lower-risk fix.

### P1 — Owner Share Hub Still Uses System Teal For Primary QR Actions

**Area:** `/owner/share`

**Observed:** The owner share hub uses teal primary buttons, while the newer owner pet profile share card correctly uses orange. This weakens the owner-side color language.

**Why it matters:** Orange is now the mental cue for pet-owner actions. Share/QR is one of the most important owner workflows, so it should be visually consistent.

**Recommendation:** Convert owner share hub primary actions to orange, with teal reserved for system/trust accents.

### P2 — Booklet Tab Row Needs A Better Mobile Scroll Affordance

**Area:** Staff pet profile booklet tabs

**Observed:** The tab row is horizontally scrollable, but the visible area cuts off labels like `Deworming` without making it obvious that more tabs are available.

**Why it matters:** This is a core navigation control for the digital booklet. Users may not discover Heartworm, Visits, or Health Notes.

**Recommendation:** Add a subtle right-edge fade, shorten labels where possible, and consider a sticky compact tab row once the user scrolls into the booklet.

### P2 — Long Owner Pet Names Still Feel Cramped In The Hero

**Area:** Owner pet profile empty-state QA pet

**Observed:** Long names truncate in the hero (`Owner QA 1777...`). The character artwork takes useful horizontal space, so the name loses context quickly.

**Why it matters:** Owner-created pet names can include nicknames or duplicate labels. Truncation is acceptable, but the current layout makes long names feel squeezed.

**Recommendation:** Allow a two-line hero title on owner profile, or reduce/shift the character when the title is long.

### P2 — Empty Linked-Care Section Still Shows A Share Action

**Area:** Owner pet profile with no linked clinics

**Observed:** The empty `Clinic Connections` section says there are no clinic connections, but still shows `Share`.

**Why it matters:** The action is not wrong, but it feels confusing in context: users may ask what they are sharing if nothing is linked.

**Recommendation:** In empty state, replace `Share` with a more explanatory action such as `Create QR` or hide the top-right action and include a single empty-state CTA.

### P2 — Visit Form Has No Sticky Save Action

**Area:** Add visit form

**Observed:** The visit form is long on mobile and the `Save Visit` action is only at the bottom.

**Why it matters:** Staff may enter findings/treatment and need to scroll all the way down to save. The care-record form already has a fixed bottom action pattern, so this feels inconsistent.

**Recommendation:** Give Add Visit the same fixed bottom action bar pattern used by Add Preventive Record.

### P3 — Public Share Header Copy Is Accurate But Slightly Technical

**Area:** Public full-profile share

**Observed:** The header label says `Temporary clinic view`.

**Why it matters:** For a clinic, this is understandable. For an owner or emergency helper opening the link, `Shared VetCard` or `Shared clinic record` may be clearer and more reassuring.

**Recommendation:** Consider changing the label to `Shared VetCard` and keep expiry information in the summary card.

### P3 — Owner Share Pet Selector Is Hard To Scan With Many Pets

**Area:** `/owner/share`

**Observed:** Pet choices render as horizontal chips. With many long pet names, the active pet is technically clear but visually noisy.

**Why it matters:** Sharing the wrong pet is a high-anxiety mistake.

**Recommendation:** Make the selected pet a prominent card, with a smaller `Change pet` horizontal selector below or a dropdown-style sheet later.

### P3 — Care Backfill Form Is Clear But Dense Above The Fold

**Area:** Add preventive record form

**Observed:** The booklet section selector plus record source selector creates a long first screen.

**Why it matters:** It is understandable, but for daily use staff may want speed. Historical backfill is less frequent, so the extra source selector should not slow normal recording.

**Recommendation:** Keep the source selector, but consider default-collapsing the explanatory descriptions after the first use, or make historical backfill a secondary toggle/link.

## Recommended Fix Order

1. Remove or activate owner/public booklet chevrons.
2. Convert owner share hub primary QR actions to orange.
3. Add scroll affordance to staff booklet tabs.
4. Add sticky bottom save bar to Add Visit.
5. Tighten owner empty linked-care state and long-name hero behavior.
6. Reword public share label and improve owner share pet selector.

## Follow-Up Fixes Applied

Date: 2026-05-05

- Removed the static chevron from owner booklet cards.
- Converted owner share hub QR actions and selected pet state to owner orange.
- Added a right-edge fade to the staff booklet tab row so horizontal scrolling is more discoverable.
- Added a sticky mobile save bar to Add Visit, matching the care-record form pattern.
- Allowed owner pet hero names to wrap to two lines and changed the empty linked-care action to `Create QR`.
- Changed the public full-profile share label from `Temporary clinic view` to `Shared VetCard`.
- Reworked the owner share hub pet picker into a prominent selected-pet card with a smaller change-pet rail, reducing the chance of creating a QR for the wrong pet.
- Warmed up expired/revoked public share states with character art, clearer privacy copy, and a simpler `Open VetCard` recovery action.
- Added a shared first-error scroll/focus helper and wired it into appointment, pet, visit, and care-record forms so mobile validation errors take users to the field that needs attention.
- Tightened sticky mobile action bars for appointment and staff pet forms, and added the same sticky owner-orange save bar to owner pet creation.
- Added a sticky submit bar to clinic workspace registration so the primary action remains reachable on long mobile setup forms.
- Corrected the visit add/edit layout to use the same fixed-height form shell as the other staff forms; browser checks confirmed bottom actions are immediately visible on staff pet, appointment, link-pet, preventive-care, and visit edit forms.

Date: 2026-05-06

- Removed character-art decorations from the active app surfaces after review showed they made the UI feel static and repetitive.
- Kept the dashboard and pet-profile next-step cards, but shifted them back to icon, copy, hierarchy, and color instead of decorative mascots.
- Removed the shared staff page fade-up animation so pages render solidly without a washed-out transition state.

## Notes

- OCR/photo import remains intentionally lower priority.
- Character image assets remain archived in the brand folder for future exploration, but they are not currently used in the app UI.
- The current fresh public share used during review was `http://127.0.0.1:8090/share/WnsAMUV9QJezXVTQs8IZGmMG`.
