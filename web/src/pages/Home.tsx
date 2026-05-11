import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  CalendarPlus,
  ChevronRight,
  ClipboardList,
  FolderOpen,
  Link2,
  PawPrint,
  Phone,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Stethoscope,
  UserRound,
  UsersRound,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { apiRequest, type AppointmentRecord, type AppointmentSummary, type DashboardSummary } from "@/lib/api";
import { useSession } from "@/lib/auth";
import {
  formatDate,
  formatPhoneForDisplay,
  formatTime,
  getErrorMessage,
  getInitials,
  getPetAccent,
  toDateInputValue,
  toPhoneHref,
} from "@/lib/format";

type FollowUpItem = AppointmentRecord & {
  followUpLabel: string;
};

function getPreviousDateKey(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() - 1);
  return toDateInputValue(date.toISOString());
}

export default function Home() {
  const { token } = useSession();
  const todayKey = useMemo(() => toDateInputValue(new Date().toISOString()), []);
  const yesterdayKey = useMemo(() => getPreviousDateKey(todayKey), [todayKey]);

  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => apiRequest<DashboardSummary>("/dashboard/summary", { token }),
    enabled: Boolean(token),
  });
  const appointmentSummaryQuery = useQuery({
    queryKey: ["appointment-summary"],
    queryFn: () => apiRequest<AppointmentSummary>("/appointments/summary", { token }),
    enabled: Boolean(token),
  });
  const todayAppointmentsQuery = useQuery({
    queryKey: ["appointments", "home-today", todayKey],
    queryFn: () => apiRequest<{ appointments: AppointmentRecord[] }>(`/appointments?date=${todayKey}&status=SCHEDULED`, { token }),
    enabled: Boolean(token),
  });
  const missedAppointmentsQuery = useQuery({
    queryKey: ["appointments", "home-missed"],
    queryFn: () => apiRequest<{ appointments: AppointmentRecord[] }>("/appointments?status=MISSED", { token }),
    enabled: Boolean(token),
  });
  const staleScheduledQuery = useQuery({
    queryKey: ["appointments", "home-stale-scheduled", yesterdayKey],
    queryFn: () => apiRequest<{ appointments: AppointmentRecord[] }>(`/appointments?endDate=${yesterdayKey}&status=SCHEDULED`, { token }),
    enabled: Boolean(token),
  });

  const todaySummary = appointmentSummaryQuery.data ?? { today: 0, due: 0, upcoming: 0 };
  const todayQueue = useMemo(
    () => (todayAppointmentsQuery.data?.appointments ?? []).slice(0, 5),
    [todayAppointmentsQuery.data?.appointments],
  );
  const missedAppointments = useMemo(
    () => missedAppointmentsQuery.data?.appointments ?? [],
    [missedAppointmentsQuery.data?.appointments],
  );
  const staleScheduled = useMemo(
    () => staleScheduledQuery.data?.appointments ?? [],
    [staleScheduledQuery.data?.appointments],
  );
  const followUpItems = useMemo<FollowUpItem[]>(() => {
    const missed = missedAppointments.map((appointment) => ({
      ...appointment,
      followUpLabel: "Missed",
    }));
    const stale = staleScheduled.map((appointment) => ({
      ...appointment,
      followUpLabel: "Unclosed",
    }));

    return [...missed, ...stale]
      .sort((left, right) => new Date(left.scheduledFor).getTime() - new Date(right.scheduledFor).getTime())
      .slice(0, 3);
  }, [missedAppointments, staleScheduled]);

  const preventiveOverdueCount = summaryQuery.data?.overdueCount ?? 0;
  const careDueCount = preventiveOverdueCount + (summaryQuery.data?.dueSoonCount ?? 0);
  const followUpCount = missedAppointments.length + staleScheduled.length;
  const attentionCount = followUpCount + preventiveOverdueCount;

  return (
    <AppLayout>
      <div className="space-y-4 px-5 pb-6 pt-3">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="label-eyebrow text-primary">Clinic desk</div>
            </div>
            <Link
              to={`/calendar?date=${todayKey}`}
              className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-card px-3 py-2 text-xs font-semibold text-primary shadow-card"
            >
              Schedule
              <ChevronRight className="size-3.5" />
            </Link>
          </div>

          <Link
            to="/pets"
            className="flex min-h-[58px] items-center gap-3 rounded-2xl border border-primary/50 bg-card px-4 shadow-card transition-colors hover:bg-primary-soft/35"
          >
            <Search className="size-6 shrink-0 text-foreground" />
            <span className="min-w-0 flex-1 text-base font-semibold text-muted-foreground">Search pet, owner, or phone</span>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <PawPrint className="size-5" />
            </span>
          </Link>
        </section>

        <section className="rounded-2xl border border-primary/10 bg-card p-3 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h1 className="label-eyebrow">Today at a glance</h1>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <RefreshCw className="size-3.5" />
              Updated now
            </span>
          </div>

          {appointmentSummaryQuery.isLoading || summaryQuery.isLoading ? (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-20 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : appointmentSummaryQuery.isError || summaryQuery.isError ? (
            <div className="mt-3 rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
              {getErrorMessage(appointmentSummaryQuery.error ?? summaryQuery.error)}
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-4 gap-2">
              <GlanceMetric icon={UsersRound} label="Today" value={todaySummary.today} />
              <GlanceMetric icon={CalendarClock} label="Next" value={todaySummary.upcoming} />
              <GlanceMetric icon={ClipboardList} label="Follow" value={followUpCount || todaySummary.due} urgent={Boolean(followUpCount || todaySummary.due)} />
              <GlanceMetric icon={ShieldCheck} label="Care" value={careDueCount} warm={Boolean(careDueCount)} />
            </div>
          )}
        </section>

        <section>
          {missedAppointmentsQuery.isLoading || staleScheduledQuery.isLoading || summaryQuery.isLoading ? (
            <div className="h-44 animate-pulse rounded-2xl bg-muted" />
          ) : missedAppointmentsQuery.isError || staleScheduledQuery.isError || summaryQuery.isError ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
              {getErrorMessage(missedAppointmentsQuery.error ?? staleScheduledQuery.error ?? summaryQuery.error)}
            </div>
          ) : attentionCount ? (
            <div className="rounded-2xl border border-destructive/25 bg-gradient-to-br from-destructive-soft/65 via-card to-tertiary-soft/40 p-3 shadow-card">
              <div className="flex items-center gap-2 px-1">
                <AlertTriangle className="size-4 shrink-0 text-destructive" />
                <h2 className="text-sm font-bold text-destructive">
                  {attentionCount} item{attentionCount === 1 ? "" : "s"} need attention
                </h2>
              </div>

              <div className="mt-2 space-y-2">
                {missedAppointments.length ? (
                  <AttentionRow
                    icon={CalendarClock}
                    title={`${missedAppointments.length} missed appointment${missedAppointments.length === 1 ? "" : "s"}`}
                    helper="Call owners or reschedule."
                    href={`/calendar?date=${todayKey}`}
                    action="Review"
                    tone="danger"
                  />
                ) : null}
                {staleScheduled.length ? (
                  <AttentionRow
                    icon={ClipboardList}
                    title={`${staleScheduled.length} unclosed visit${staleScheduled.length === 1 ? "" : "s"}`}
                    helper="Add notes, record visit, or mark missed."
                    href={followUpItems[0] ? `/appointments/${followUpItems[0].id}` : `/calendar?date=${todayKey}`}
                    action="Open"
                    tone="warm"
                  />
                ) : null}
                {preventiveOverdueCount ? (
                  <AttentionRow
                    icon={ShieldCheck}
                    title={`${preventiveOverdueCount} overdue care item${preventiveOverdueCount === 1 ? "" : "s"}`}
                    helper="Review preventive follow-up."
                    href="/pets"
                    action="Find"
                    tone="warm"
                  />
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-primary/15 bg-primary-soft/45 p-4 shadow-card">
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-card text-success shadow-card">
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold">Desk is clear</h2>
                  <p className="text-sm text-muted-foreground">No missed appointments or overdue care need action right now.</p>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <UsersRound className="size-4 text-primary" />
              <h2 className="label-eyebrow">Next patients</h2>
            </div>
            <Link to={`/calendar?date=${todayKey}`} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              Full schedule
              <ChevronRight className="size-3.5" />
            </Link>
          </div>

          {todayAppointmentsQuery.isLoading ? (
            <div className="divide-y divide-border/70">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-24 animate-pulse bg-muted/50" />
              ))}
            </div>
          ) : todayAppointmentsQuery.isError ? (
            <div className="m-4 rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
              {getErrorMessage(todayAppointmentsQuery.error)}
            </div>
          ) : todayQueue.length ? (
            <div className="divide-y divide-border/70">
              {todayQueue.map((appointment) => (
                <QueueRow key={appointment.id} appointment={appointment} />
              ))}
            </div>
          ) : (
            <div className="px-4 py-5 text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-2xl bg-success-soft text-success">
                <ShieldCheck className="size-5" />
              </div>
              <div className="mt-3 font-semibold">No scheduled patients today.</div>
              <p className="mx-auto mt-1 max-w-[18rem] text-sm text-muted-foreground">Use the quiet window for profile links or record cleanup.</p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-primary/10 bg-primary-soft/50 p-3 shadow-card">
          <div className="label-eyebrow px-1 pb-2">Quick actions</div>
          <div className="grid grid-cols-3 gap-2">
            <QuickAction href={`/appointments/new?date=${todayKey}`} icon={CalendarPlus} label="Appointment" />
            <QuickAction href="/pets/new" icon={PlusCircle} label="New pet" />
            <QuickAction href="/pets/link" icon={Link2} label="Link profile" />
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

function GlanceMetric({
  icon: Icon,
  label,
  value,
  urgent,
  warm,
}: {
  icon: typeof UsersRound;
  label: string;
  value: number;
  urgent?: boolean;
  warm?: boolean;
}) {
  const isZero = value === 0;
  const iconTone = isZero
    ? "text-muted-foreground/55"
    : urgent
      ? "text-destructive"
      : warm
        ? "text-tertiary"
        : "text-primary";
  const valueTone = isZero
    ? "text-muted-foreground/60"
    : urgent
      ? "text-destructive"
      : warm
        ? "text-tertiary"
        : "";
  const labelTone = isZero ? "text-muted-foreground/65" : "text-muted-foreground";

  return (
    <div className="min-w-0 rounded-2xl border border-border/70 bg-card px-1.5 py-2 text-center shadow-card">
      <Icon className={`mx-auto size-[18px] ${iconTone}`} />
      <div className={`mt-1 font-display text-xl font-bold leading-none ${valueTone}`}>{value}</div>
      <div className={`mt-1 text-[10px] font-bold uppercase tracking-[0.05em] ${labelTone}`}>{label}</div>
    </div>
  );
}

function AttentionRow({
  icon: Icon,
  title,
  helper,
  href,
  action,
  tone,
}: {
  icon: typeof CalendarClock;
  title: string;
  helper: string;
  href: string;
  action: string;
  tone: "danger" | "warm";
}) {
  const toneClass =
    tone === "danger"
      ? "bg-destructive-soft text-destructive"
      : "bg-tertiary-soft text-tertiary";

  return (
    <Link to={href} state={{ from: "/home" }} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/78 p-2.5 transition-colors hover:border-primary/35">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{title}</span>
        <span className="mt-0.5 block truncate text-sm text-muted-foreground">{helper}</span>
      </span>
      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${toneClass}`}>{action}</span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function QueueRow({ appointment }: { appointment: AppointmentRecord }) {
  return (
    <div className="grid grid-cols-[4.25rem_1fr_auto] items-center gap-3 px-4 py-3">
      <div className="text-center">
        <div className="font-display text-base font-bold leading-tight">{formatTime(appointment.scheduledFor)}</div>
        <div className="mt-1 inline-block size-2 rounded-full bg-tertiary" />
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${getPetAccent(appointment.pet.species)}`}>
            {getInitials(appointment.pet.name)}
          </span>
          <div className="min-w-0">
            <Link to={`/appointments/${appointment.id}`} state={{ from: "/home" }} className="block truncate font-display text-lg font-bold leading-tight">
              {appointment.pet.name}
            </Link>
            <p className="truncate text-sm text-muted-foreground">{appointment.pet.owner.fullName}</p>
          </div>
        </div>
        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
          <span className="max-w-[10rem] truncate text-sm text-muted-foreground">{appointment.reason}</span>
          <StatusBadge tone="neutral">{formatAppointmentStatus(appointment.status)}</StatusBadge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <a
          href={`tel:${toPhoneHref(appointment.pet.owner.mobile)}`}
          className="flex size-10 items-center justify-center rounded-2xl bg-primary-soft text-primary"
          aria-label={`Call ${formatPhoneForDisplay(appointment.pet.owner.mobile)}`}
        >
          <Phone className="size-4" />
        </a>
        <Link
          to={`/pets/${appointment.pet.id}`}
          state={{ from: "/home" }}
          className="flex size-10 items-center justify-center rounded-2xl bg-secondary text-foreground"
          aria-label={`Open ${appointment.pet.name}'s profile`}
        >
          <FolderOpen className="size-4" />
        </Link>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof CalendarPlus;
  label: string;
}) {
  return (
    <Link
      to={href}
      state={{ from: "/home" }}
      className="flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card px-2 py-3 text-center text-sm font-bold text-primary shadow-card transition-colors hover:border-primary/40"
    >
      <Icon className="size-6" />
      <span className="leading-tight">{label}</span>
    </Link>
  );
}

function formatAppointmentStatus(status: AppointmentRecord["status"]) {
  const labels: Record<AppointmentRecord["status"], string> = {
    SCHEDULED: "Scheduled",
    COMPLETED: "Done",
    CANCELLED: "Cancelled",
    MISSED: "Missed",
  };

  return labels[status];
}
