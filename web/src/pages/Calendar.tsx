import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  ListFilter,
  Phone,
  Plus,
  Stethoscope,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { apiRequest, type AppointmentRecord, type CalendarVisitRecord } from "@/lib/api";
import { useSession } from "@/lib/auth";
import {
  formatAppointmentStatus,
  formatDate,
  formatPhoneForDisplay,
  formatTime,
  formatWeightKg,
  getErrorMessage,
  getInitials,
  getPetAccent,
  toDateInputValue,
  toPhoneHref,
} from "@/lib/format";

type CalendarFilter = "all" | "appointments" | "visits" | "overdue";
type CalendarRecord =
  | { type: "appointment"; appointment: AppointmentRecord; time: string; overdue: boolean }
  | { type: "visit"; visit: CalendarVisitRecord; time: string; overdue: false };

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

function isSameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getAppointmentTone(appointment: AppointmentRecord) {
  if (appointment.status === "COMPLETED") {
    return "success" as const;
  }

  if (appointment.status === "MISSED") {
    return "danger" as const;
  }

  if (appointment.status === "CANCELLED") {
    return "neutral" as const;
  }

  return new Date(appointment.scheduledFor) < new Date() ? "danger" as const : "info" as const;
}

function getAppointmentStatusLabel(appointment: AppointmentRecord) {
  if (appointment.status === "SCHEDULED") {
    return new Date(appointment.scheduledFor) < new Date() ? "Overdue" : "Scheduled";
  }

  return formatAppointmentStatus(appointment.status);
}

function getVisitSummary(visit: CalendarVisitRecord) {
  const weightLabel = visit.weightKg ? ` · ${formatWeightKg(visit.weightKg)}` : "";

  if (visit.diagnosis?.trim()) {
    return `Diagnosis: ${visit.diagnosis}${weightLabel}`;
  }

  if (visit.followUpNotes?.trim()) {
    return `Follow-up: ${visit.followUpNotes}${weightLabel}`;
  }

  return `Attended by ${visit.attendedBy.fullName}${weightLabel}`;
}

function getWeekDays(selectedDate: Date) {
  const start = addDays(selectedDate, -selectedDate.getDay());
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export default function CalendarPage() {
  const { token } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDate = searchParams.get("date");
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const parsed = initialDate ? new Date(initialDate) : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  });
  const [month, setMonth] = useState<Date>(getMonthStart(selectedDate));
  const [filter, setFilter] = useState<CalendarFilter>("all");

  const monthStart = useMemo(() => getMonthStart(month), [month]);
  const monthEnd = useMemo(() => getMonthEnd(month), [month]);
  const monthStartKey = useMemo(() => toDateInputValue(monthStart.toISOString()), [monthStart]);
  const monthEndKey = useMemo(() => toDateInputValue(monthEnd.toISOString()), [monthEnd]);
  const selectedDateKey = useMemo(() => toDateInputValue(selectedDate.toISOString()), [selectedDate]);
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

  const appointmentsQuery = useQuery({
    queryKey: ["appointments", monthStartKey, monthEndKey],
    queryFn: () =>
      apiRequest<{ appointments: AppointmentRecord[] }>(`/appointments?startDate=${monthStartKey}&endDate=${monthEndKey}`, {
        token,
      }),
    enabled: Boolean(token),
  });
  const visitsQuery = useQuery({
    queryKey: ["visits", monthStartKey, monthEndKey],
    queryFn: () => apiRequest<{ visits: CalendarVisitRecord[] }>(`/visits?startDate=${monthStartKey}&endDate=${monthEndKey}`, { token }),
    enabled: Boolean(token),
  });
  const linkedAppointmentIds = useMemo(
    () =>
      new Set(
        (visitsQuery.data?.visits ?? [])
          .map((visit) => visit.appointmentId)
          .filter((appointmentId): appointmentId is string => Boolean(appointmentId)),
      ),
    [visitsQuery.data?.visits],
  );

  const selectedAppointments = useMemo(() => {
    return (appointmentsQuery.data?.appointments ?? []).filter(
      (appointment) =>
        !linkedAppointmentIds.has(appointment.id) && isSameCalendarDay(new Date(appointment.scheduledFor), selectedDate),
    );
  }, [appointmentsQuery.data?.appointments, linkedAppointmentIds, selectedDate]);
  const selectedVisits = useMemo(() => {
    return (visitsQuery.data?.visits ?? []).filter((visit) => isSameCalendarDay(new Date(visit.visitDate), selectedDate));
  }, [selectedDate, visitsQuery.data?.visits]);
  const recordDays = useMemo(() => {
    const keys = new Set<string>();

    for (const appointment of appointmentsQuery.data?.appointments ?? []) {
      if (!linkedAppointmentIds.has(appointment.id)) {
        keys.add(new Date(appointment.scheduledFor).toDateString());
      }
    }

    for (const visit of visitsQuery.data?.visits ?? []) {
      keys.add(new Date(visit.visitDate).toDateString());
    }

    return keys;
  }, [appointmentsQuery.data?.appointments, linkedAppointmentIds, visitsQuery.data?.visits]);

  const calendarRecords = useMemo<CalendarRecord[]>(
    () =>
      [
        ...selectedAppointments.map((appointment) => ({
          type: "appointment" as const,
          appointment,
          time: appointment.scheduledFor,
          overdue: getAppointmentTone(appointment) === "danger",
        })),
        ...selectedVisits.map((visit) => ({
          type: "visit" as const,
          visit,
          time: visit.visitDate,
          overdue: false as const,
        })),
      ].sort((left, right) => new Date(left.time).getTime() - new Date(right.time).getTime()),
    [selectedAppointments, selectedVisits],
  );
  const overdueRecords = useMemo(
    () => calendarRecords.filter((record) => record.type === "appointment" && record.overdue),
    [calendarRecords],
  );
  const filteredRecords = useMemo(() => {
    if (filter === "appointments") {
      return calendarRecords.filter((record) => record.type === "appointment");
    }

    if (filter === "visits") {
      return calendarRecords.filter((record) => record.type === "visit");
    }

    if (filter === "overdue") {
      return overdueRecords;
    }

    return calendarRecords;
  }, [calendarRecords, filter, overdueRecords]);
  const selectedMonthLabel = selectedDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const selectedDayLabel = selectedDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const filters = [
    { key: "all" as const, label: "All", count: calendarRecords.length },
    { key: "appointments" as const, label: "Appointments", count: selectedAppointments.length },
    { key: "visits" as const, label: "Visits", count: selectedVisits.length },
    { key: "overdue" as const, label: "Overdue", count: overdueRecords.length },
  ];
  const calendarLoading = appointmentsQuery.isLoading || visitsQuery.isLoading;
  const calendarError = appointmentsQuery.isError || visitsQuery.isError;

  const changeSelectedDate = (date: Date) => {
    setSelectedDate(date);
    setMonth(getMonthStart(date));
    setSearchParams({ date: toDateInputValue(date.toISOString()) });
  };

  return (
    <AppLayout>
      <div className="space-y-3 px-5 pb-6 pt-3">
        <section className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold">Calendar</h1>
          </div>
          <Button asChild variant="hero" size="sm" className="shrink-0 rounded-2xl">
            <Link to={`/appointments/new?date=${selectedDateKey}`} state={{ from: `/calendar?date=${selectedDateKey}` }}>
              <Plus className="size-4" /> Add
            </Link>
          </Button>
        </section>

        <section className="rounded-2xl border border-primary/10 bg-card p-2.5 shadow-card">
          <div className="mb-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => changeSelectedDate(addDays(selectedDate, -7))}
              className="flex size-9 items-center justify-center rounded-2xl border border-border/70 bg-card text-muted-foreground shadow-card"
              aria-label="Previous week"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="min-w-0 text-center">
              <div className="font-display text-base font-bold">{selectedDayLabel}</div>
              <div className="text-[11px] font-medium text-muted-foreground">{selectedMonthLabel}</div>
            </div>
            <button
              type="button"
              onClick={() => changeSelectedDate(addDays(selectedDate, 7))}
              className="flex size-9 items-center justify-center rounded-2xl border border-border/70 bg-card text-muted-foreground shadow-card"
              aria-label="Next week"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => {
              const selected = isSameCalendarDay(day, selectedDate);
              const hasRecords = recordDays.has(day.toDateString());

              return (
                <button
                  key={day.toDateString()}
                  type="button"
                  onClick={() => changeSelectedDate(day)}
                  className={`relative flex min-h-[58px] flex-col items-center justify-center rounded-2xl px-1 transition-colors ${
                    selected ? "bg-primary text-primary-foreground shadow-float" : "text-foreground hover:bg-primary-soft/50"
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase ${selected ? "text-primary-foreground/85" : "text-muted-foreground"}`}>
                    {day.toLocaleDateString(undefined, { weekday: "short" })}
                  </span>
                  <span className="mt-0.5 font-display text-lg font-bold leading-none">{day.getDate()}</span>
                  {hasRecords ? (
                    <span className={`absolute bottom-1.5 size-1.5 rounded-full ${selected ? "bg-primary-foreground" : "bg-primary"}`} />
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-primary/10 bg-card p-2.5 shadow-card">
          {calendarLoading ? (
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : calendarError ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
              {getErrorMessage(appointmentsQuery.error ?? visitsQuery.error)}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              <ScheduleMetric icon={FileText} label="Total" value={calendarRecords.length} />
              <ScheduleMetric icon={AlertTriangle} label="Overdue" value={overdueRecords.length} danger={Boolean(overdueRecords.length)} />
              <ScheduleMetric icon={Stethoscope} label="Visits" value={selectedVisits.length} />
              <ScheduleMetric icon={CalendarClock} label="Appts" value={selectedAppointments.length} />
            </div>
          )}
        </section>

        {!calendarLoading && !calendarError && overdueRecords.length ? (
          <Link
            to={overdueRecords[0].type === "appointment" ? `/appointments/${overdueRecords[0].appointment.id}` : `/calendar?date=${selectedDateKey}`}
            state={{ from: `/calendar?date=${selectedDateKey}` }}
            className="flex items-center gap-2 rounded-xl border border-destructive/25 bg-destructive-soft/55 px-3 py-2 shadow-card transition-colors hover:bg-destructive-soft/75"
          >
            <AlertTriangle className="size-4 shrink-0 text-destructive" />
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-destructive">
              {overdueRecords.length} overdue item{overdueRecords.length === 1 ? "" : "s"} — review
            </span>
            <ChevronRight className="size-4 shrink-0 text-destructive" />
          </Link>
        ) : null}

        {calendarError ? null : (
          <section className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {calendarLoading
              ? [0, 1, 2, 3].map((item) => (
                  <div key={item} className="h-10 w-28 shrink-0 animate-pulse rounded-2xl bg-muted shadow-card" />
                ))
              : filters.map((item) => {
                  const active = filter === item.key;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setFilter(item.key)}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-bold shadow-card ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : item.key === "overdue"
                            ? "border-destructive/25 bg-card text-destructive"
                            : "border-border/70 bg-card text-foreground"
                      }`}
                    >
                      {item.label}
                      <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"}`}>
                        {item.count}
                      </span>
                    </button>
                  );
                })}
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-2.5 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-3.5" />
              Clinic time · sorted by time
            </span>
            <ListFilter className="size-3.5" />
          </div>

          {calendarLoading ? (
            <div className="divide-y divide-border/70">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-24 animate-pulse bg-muted/50" />
              ))}
            </div>
          ) : calendarError ? (
            <div className="m-4 rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
              {getErrorMessage(appointmentsQuery.error ?? visitsQuery.error)}
            </div>
          ) : filteredRecords.length ? (
            <div className="divide-y divide-border/70">
              {filteredRecords.map((record) => (
                <AgendaRow key={record.type === "appointment" ? record.appointment.id : record.visit.id} record={record} selectedDateKey={selectedDateKey} />
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center">
              <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <CalendarClock className="size-5" />
              </div>
              <div className="mt-3 font-semibold">Nothing in this view.</div>
              <p className="mx-auto mt-1 max-w-[17rem] text-sm text-muted-foreground">Try another filter or add an appointment for this date.</p>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

function ScheduleMetric({
  icon: Icon,
  label,
  value,
  danger,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border/70 bg-card px-2 py-2 text-center shadow-card">
      <Icon className={`mx-auto size-[18px] ${danger ? "text-destructive" : "text-primary"}`} />
      <div className={`mt-1 font-display text-xl font-bold leading-none ${danger ? "text-destructive" : ""}`}>{value}</div>
      <div className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.04em] text-muted-foreground">{label}</div>
    </div>
  );
}

function AgendaRow({ record, selectedDateKey }: { record: CalendarRecord; selectedDateKey: string }) {
  if (record.type === "appointment") {
    const { appointment } = record;
    const statusTone = getAppointmentTone(appointment);

    return (
      <div className="grid grid-cols-[4.5rem_1fr_auto] gap-3 px-4 py-3">
        <AgendaTime time={appointment.scheduledFor} urgent={record.overdue} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="neutral">Appointment</StatusBadge>
            <StatusBadge tone={statusTone} icon>
              {getAppointmentStatusLabel(appointment)}
            </StatusBadge>
          </div>
          <Link
            to={`/appointments/${appointment.id}`}
            state={{ from: `/calendar?date=${selectedDateKey}` }}
            className="mt-2 block font-display text-base font-bold leading-snug line-clamp-2"
          >
            {appointment.reason}
          </Link>
          <div className="mt-1 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <span className={`flex size-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${getPetAccent(appointment.pet.species)}`}>
              {getInitials(appointment.pet.name)}
            </span>
            <span className="truncate">
              {appointment.pet.name} · {appointment.pet.owner.fullName}
            </span>
          </div>
          {appointment.notes ? (
            <div className="mt-2 flex items-start gap-2 text-sm leading-5 text-muted-foreground">
              <FileText className="mt-0.5 size-4 shrink-0" />
              <span className="line-clamp-1">{appointment.notes}</span>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`tel:${toPhoneHref(appointment.pet.owner.mobile)}`}
            aria-label={`Call ${formatPhoneForDisplay(appointment.pet.owner.mobile)}`}
            className="flex size-10 items-center justify-center rounded-2xl bg-primary-soft text-primary"
          >
            <Phone className="size-4" />
          </a>
          <Link
            to={`/appointments/${appointment.id}`}
            state={{ from: `/calendar?date=${selectedDateKey}` }}
            aria-label={`Open ${appointment.reason}`}
            className="flex size-10 items-center justify-center rounded-2xl border border-border/70 bg-card text-muted-foreground shadow-card"
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  const { visit } = record;

  return (
    <div className="grid grid-cols-[4.5rem_1fr_auto] gap-3 px-4 py-3">
      <AgendaTime time={visit.visitDate} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="neutral">Visit</StatusBadge>
          <StatusBadge tone={visit.diagnosis ? "info" : "neutral"}>
            {visit.diagnosis ? "Diagnosis logged" : "Visit recorded"}
          </StatusBadge>
        </div>
        <Link
          to={`/pets/${visit.pet.id}/visits/${visit.id}`}
          state={{ from: `/calendar?date=${selectedDateKey}` }}
          className="mt-2 block truncate font-display text-base font-bold"
        >
          {visit.reasonForVisit}
        </Link>
        <div className="mt-1 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <span className={`flex size-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${getPetAccent(visit.pet.species)}`}>
            {getInitials(visit.pet.name)}
          </span>
          <span className="truncate">
            {visit.pet.name} · {visit.pet.owner.fullName}
          </span>
        </div>
        <div className="mt-2 flex items-start gap-2 text-sm leading-5 text-muted-foreground">
          <FileText className="mt-0.5 size-4 shrink-0" />
          <span className="line-clamp-1">{getVisitSummary(visit)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={`tel:${toPhoneHref(visit.pet.owner.mobile)}`}
          aria-label={`Call ${formatPhoneForDisplay(visit.pet.owner.mobile)}`}
          className="flex size-10 items-center justify-center rounded-2xl bg-primary-soft text-primary"
        >
          <Phone className="size-4" />
        </a>
        <Link
          to={`/pets/${visit.pet.id}/visits/${visit.id}`}
          state={{ from: `/calendar?date=${selectedDateKey}` }}
          aria-label={`Open ${visit.reasonForVisit}`}
          className="flex size-10 items-center justify-center rounded-2xl border border-border/70 bg-card text-muted-foreground shadow-card"
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

function AgendaTime({ time, urgent }: { time: string; urgent?: boolean }) {
  return (
    <div className="relative text-center">
      <div className="font-display text-base font-bold leading-tight">{formatTime(time)}</div>
      <div className={`mx-auto mt-2 size-2 rounded-full ${urgent ? "bg-destructive" : "bg-primary"}`} />
    </div>
  );
}
