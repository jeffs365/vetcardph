# VetCard PH Pilot Intake And Report

**Purpose:** standardize the first clinic pilot so it produces a result, not just a conversation.

---

## Pilot intake

### Clinic details

```text
Clinic name:
City:
Contact person:
Role:
Phone/Messenger:
Pilot start date:
Pilot end date:
Reminder channel:
Clinic approval contact:
```

### Current workflow

```text
How does the clinic record vaccine/deworming/follow-up today?
Who checks due dates?
Who sends reminders?
What usually gets missed?
What services should the pilot focus on?
```

### Record batch

Minimum fields:

```text
pet_name
owner_name_or_nickname
mobile_or_messenger
service_type
last_service_date
next_due_date
notes
```

Use only the minimum data needed for reminders. Do not request full medical history for the first pilot.

---

## Pilot consent checklist

Before reminders are sent, confirm:

```text
Clinic provided the selected records voluntarily:
Clinic approved the reminder message:
Clinic approved the reminder channel:
Clinic understands only pilot records are included:
Clinic can request export/delete of pilot data:
```

---

## Reminder tracking

Use these statuses:

```text
not_due
due_soon
overdue
message_prepared
approved
sent
replied
booked
visited
no_response
bad_contact
deferred
```

---

## Pilot result report

```text
VetCard Pilot Result

Clinic:
Location:
Pilot period:

Records encoded:
Due/overdue pets found:
Reminders approved:
Reminders sent:
Replies received:
Bookings or walk-ins attributed:
Completed return visits:
Estimated recovered revenue:

What worked:
- 
- 

What blocked results:
- 
- 

Clinic feedback:
"
"

Recommended next step:
Continue monthly reminders for vaccine, deworming, and follow-up clients.
```

---

## Revenue estimate

```text
completed_return_visits x average_service_value = estimated_recovered_revenue
```

Example:

```text
3 completed visits x PHP 800 = PHP 2,400 estimated recovered revenue
```
