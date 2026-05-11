# Clinic Ops UX Priorities

Date: 2026-05-06

## North Star

VetCard clinic staff UI should feel like a calm mobile command center for receptionists, assistants, and clinic staff.

The main question is:

> What needs my attention right now, and how fast can I act?

## Staff Cares About

1. Today's queue
   - Who is scheduled today.
   - Who needs a visit recorded.
   - Who can be called, opened, or rescheduled quickly.

2. Fast pet and owner lookup
   - Pet name, owner name, mobile number, and shared profile lookup should be one tap away.
   - Search should feel like a primary workflow, not a secondary screen.

3. Attention needed
   - Missed appointments.
   - Past scheduled appointments that were not closed.
   - Overdue preventive care.
   - Unlinked or incomplete records.

4. Minimal typing
   - Prefer presets, obvious buttons, links, and prefilled appointment context.
   - Staff should not need to re-enter information that VetCard already has.

5. Confidence
   - Pet name, owner name, mobile number, species/breed, and latest/next care status should be visible before staff acts.
   - Avoid decorative UI that competes with clinical or operational facts.

## Phase Plan

### Phase 1 — Staff Home As Clinic Desk

- Put today's queue, attention needed, and search above generic quick actions.
- Make every queue item actionable: open appointment, record visit, call owner, open pet.
- Move clinic snapshot lower.
- Keep visual style calm and dense.

### Phase 2 — Patient Workbench

- Reorder pet profile around current work: identity, owner contact, alerts, next/last care, actions, then history/booklet.
- Reduce repeated cards.
- Make health notes and due care feel like current-state facts.

### Phase 3 — Reception Workflow States

- Consider backend support for appointment states such as arrived, waiting, in room, checked out.
- Add a compact queue board once workflow states exist.

### Phase 4 — Search And Link Speed

- Make owner/pet lookup faster from Home and Add flows.
- Reduce duplicate entry when an owner or pet already exists.

## Lower Priority

- OCR/photo import remains lower priority.
- Decorative character usage is paused; existing assets are archived for future exploration only.
