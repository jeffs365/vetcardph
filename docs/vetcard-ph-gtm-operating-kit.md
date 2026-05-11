# VetCard PH GTM Operating Kit

**Date:** 2026-05-11  
**Mode:** Codex-owned execution, user-guided only when needed  
**Primary goal:** get the first serious clinic pilot for the VetCard comeback reminder offer.

---

## Operating rules

Codex owns the day-to-day execution system:

- maintain outreach assets and trackers
- draft replies and follow-ups
- choose first target areas when no preference is given
- keep messaging natural, short, and non-AI sounding
- recommend the next move based on reply and pilot data
- ask the user only when a decision is critical

Critical decisions include:

- sharing or requesting sensitive client/pet-owner data in a new way
- committing to unusual pricing, exclusivity, or custom work
- sending anything that could create legal, privacy, or reputational risk
- confirming an in-person visit or call time that requires the user's presence

Default area focus:

1. Bulacan
2. Pampanga
3. Metro Manila edge cities

This can change if replies are stronger somewhere else.

---

## Positioning

Do not sell VetCard as a full clinic management system first.

Lead with this:

> VetCard helps clinics find pets that are due or overdue for vaccine, deworming, grooming, or follow-up, then send reminders so owners come back.

The working offer is:

> Free 2-week comeback reminder pilot for 10 to 30 selected records.

Use 10 records for cold or hesitant clinics. Use 20 to 30 records for warmer clinics.

---

## Daily workflow

Every active day:

1. Add or clean target clinics in `leads/vetcard-ph-clinic-outreach-tracker.csv`.
2. Contact 5 to 10 clinics.
3. Follow up warm or older leads.
4. Log the exact status and next follow-up date.
5. Move any reply toward one of these outcomes:
   - quick process question
   - discovery call
   - sample 10-record due/overdue list
   - 2-week pilot batch

Do not count page likes, generic compliments, or "send details" as traction.

---

## First message variants

### Soft question first

```text
Hi Doc/Team, good day po. Quick question lang po:

How do you currently track pets na due or overdue na for vaccine or deworming? Paper card, notebook, Excel, or Messenger po ba?
```

Use this when the clinic is cold and there is no trust yet.

### Pilot offer

```text
Hi Doc/Team, good day po. I am helping vet clinics test a simple reminder workflow for vaccine/deworming follow-ups.

Free pilot po siya: send 10 to 20 selected records, then VetCard helps find due/overdue pets and prepare reminder messages. No need to migrate all records.

Would this be useful to test for your clinic?
```

Use this when the clinic looks active and likely to care about follow-ups.

### Local/in-person angle

```text
Hi Doc/Team, good day po. I am building VetCard for PH clinics and starting with a small reminder pilot.

The idea is simple: help clinics find pets due or overdue for vaccine/deworming, then remind owners so they come back.

Could I ask how your clinic tracks follow-up schedules today?
```

Use this when targeting nearby clinics.

---

## Follow-up sequence

### Follow-up 1, after 2 days

```text
Hi Doc/Team, follow-up ko lang po.

The pilot can start with just 10 records. I can help make a due/overdue list first, so you can see if reminders are worth testing.
```

### Follow-up 2, after 4 to 5 days

```text
Example po: if a pet had a vaccine last month and the next dose is due soon, VetCard helps catch that schedule and prepare a reminder.

No full system rollout needed. Small test lang po muna.
```

### Breakup, after 7 to 10 days

```text
Last follow-up po. I do not want to spam.

If vaccine/deworming reminders are not a priority right now, no problem po. If you want to test later, I can help with a small free pilot.

Thank you po.
```

---

## Reply handling

### If they say "send details"

```text
Sure po.

VetCard can run a small 2-week reminder pilot. Your clinic sends 10 to 20 selected vaccine/deworming records, then we help identify which pets are due or overdue and prepare reminders. After that, we track replies or return visits.

No need to migrate all records. May I ask what you use now for follow-up tracking: paper card, notebook, Excel, or Messenger?
```

### If they ask "how much?"

```text
The small pilot is free po. We only want to prove first if reminders can bring back clients.

If useful after the pilot, continuation can start at PHP 999/month.
```

### If they are worried about data

```text
For the pilot, minimum details lang po: pet name, owner first name or nickname, contact number, service, last date, and due date.

No full medical history needed. The clinic approves the reminder wording before anything is sent.
```

### If they are busy

```text
Understood po. That is why we can keep it very small: even 10 records first.

You can send a simple list or photos of selected cards, then I prepare the due/overdue list for review.
```

### If they already use paper cards

```text
Okay lang po. VetCard does not need to replace paper right away.

The first test is only to help catch due or overdue vaccine/deworming clients so fewer follow-ups are missed.
```

---

## Pilot conversion path

The ideal path is:

1. Clinic replies.
2. Ask how they track follow-ups today.
3. Offer a 10-record due/overdue list.
4. If they send records, prepare the list and reminder messages.
5. Ask permission for the clinic-approved reminder batch.
6. Track replies, bookings, visits, and estimated recovered revenue.
7. Turn result into a short case study.
8. Ask for paid continuation.

---

## Status values

Use these in the tracker:

```text
not_contacted
contacted_1
contacted_2
contacted_3
replied
details_sent
discovery_scheduled
pilot_offered
pilot_agreed
pilot_running
won
lost_no_response
lost_not_fit
lost_using_existing_system
```

---

## Success thresholds

After 50 contacted clinics:

- 5 to 10 replies means the channel/message is alive
- 2 to 4 discovery conversations means the offer has some pull
- 1 pilot agreement means the plan is working

If 50 targeted clinics produce zero replies, change channel or message.

If clinics reply but do not pilot, reduce the ask to 10 records or offer an on-site/assisted setup.

If a pilot starts but no clients return, improve the batch quality, reminder channel, and tracking before judging the product.
