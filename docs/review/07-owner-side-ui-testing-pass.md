# Owner-Side UI Testing Pass

Date: 2026-05-04
Area: Pet owner flow
Environment: `http://127.0.0.1:8090`

## Scope Covered

- Owner phone sign-in with dev OTP.
- Owner home dashboard and pet switching.
- Pet list search.
- Owner pet creation.
- Owner pet profile.
- Owner share hub, full-profile QR creation, public share opening, and revoke.
- Owner account view, edit mode, and no-op save.

## Test Data Created

- `Owner QA 1777886757492`: created before the owner birth-date fix; retained as a known pre-fix test record with `Unknown age`.
- `Owner QA DOB 1777886978435`: created during first verification attempt; retained as a known pre-fix test record with `Unknown age`.
- `Owner QA DOB2 1777887026930`: created after the fix; verified birth date persists and renders as `6 yr 2 mo`.

## Findings Addressed

1. Owner pet profile summary cards navigated to the wrong place.
   - Before: `Next Appointment`, `Last Visit`, `Latest Care Item`, and `Next Care Due` all linked to `/owner/share`.
   - Fix: Converted those summary cards into non-clickable status cards until dedicated destination pages or anchors exist.
   - Verified: Cards no longer appear as links in the owner pet profile DOM.

2. Owner-created pets could lose the birth date.
   - Before: A date entered into the owner add-pet form saved successfully, but the resulting profile showed `Unknown age`.
   - Fix: Mirrored the clinic add-pet form's native `FormData` fallback for the date input.
   - Verified: New pet `Owner QA DOB2 1777887026930` saved with birth date and rendered `6 yr 2 mo`.

3. Share hub pet selection did not expose selected state semantically.
   - Before: Selected pet was visible by styling only.
   - Fix: Added `aria-pressed` to pet selection buttons.
   - Verified: Selected pet appears as `[pressed]` in the accessibility snapshot.

4. Share card `Open page` did not navigate in the in-app browser context.
   - Before: Clicking `Open page` stayed on `/owner/share`.
   - Fix: Changed the link to open in the same tab instead of `target="_blank"`.
   - Verified: Full-profile share opened at `/share/RFcThHxuu4JTwLLnrZmVTT2p`, then revoke correctly changed the public page to `This share link has been revoked.`

5. Owner account edit close button had no accessible name.
   - Before: Edit mode showed an unlabeled icon button.
   - Fix: Added `aria-label="Cancel profile editing"`.
   - Verified: Button appears as `Cancel profile editing` in the accessibility snapshot.

6. Revoked public share links were a dead end.
   - Before: A revoked QR opened to a single message with no way back into VetCard.
   - Fix: Added a friendly inactive-link state with `Back to app` and `Owner sign in` actions.
   - Verified: Revoked share page shows the new actions.

## Passing Checks

- Owner login reached `/owner/home` successfully using dev OTP.
- Owner pet list search filtered to `Bruno`.
- Owner add-pet form creates a pet and navigates to its profile.
- Owner account edit mode opens and save returns to read-only mode.
- Share creation, public share viewing, and revoke all work end to end.
- `npm run build` passes.

## Open Items

- No open owner-side blockers found in this pass.
- Pre-fix QA pets with missing birth dates remain in local dev data; they can be ignored or cleaned up later.
