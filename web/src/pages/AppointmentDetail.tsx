import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, CalendarClock, ChevronLeft, PawPrint, Phone, StickyNote, UserRound } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { apiRequest, type AppointmentRecord } from "@/lib/api";
import { useSession } from "@/lib/auth";
import {
  formatAppointmentStatus,
  formatDateTime,
  formatPhoneForDisplay,
  formatWeightKg,
  formatRole,
  getErrorMessage,
  toPhoneHref,
  getInitials,
  getPetAccent,
  getPetAgeLabel,
  getPetColorSwatch,
  getPetTypeLabel,
  titleCase,
  toDateInputValue,
} from "@/lib/format";
import { readReturnTo } from "@/lib/navigation";

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

  return new Date(appointment.scheduledFor) < new Date() ? ("danger" as const) : ("info" as const);
}

function getAppointmentLabel(appointment: AppointmentRecord) {
  if (appointment.status === "SCHEDULED") {
    return new Date(appointment.scheduledFor) < new Date() ? "Overdue" : "Scheduled";
  }

  return formatAppointmentStatus(appointment.status);
}

export default function AppointmentDetail() {
  const { appointmentId = "" } = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { token } = useSession();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const appointmentQuery = useQuery({
    queryKey: ["appointment", appointmentId],
    queryFn: () => apiRequest<{ appointment: AppointmentRecord }>(`/appointments/${appointmentId}`, { token }),
    enabled: Boolean(token && appointmentId),
  });

  const appointment = appointmentQuery.data?.appointment;
  const returnTo =
    readReturnTo(location.state) ?? (appointment ? `/calendar?date=${toDateInputValue(appointment.scheduledFor)}` : "/calendar");

  const updateStatus = useMutation({
    mutationFn: (status: AppointmentRecord["status"]) =>
      apiRequest(`/appointments/${appointmentId}/status`, {
        method: "PATCH",
        token,
        body: { status },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      await queryClient.invalidateQueries({ queryKey: ["appointment-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["appointment", appointmentId] });
      setCancelDialogOpen(false);
    },
  });

  const backButton = (
    <Link
      to={returnTo}
      aria-label="Back"
      className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <ChevronLeft className="size-5" />
    </Link>
  );

  if (appointmentQuery.isLoading) {
    return (
      <AppLayout title="Appointment" titleHref={null} headerStart={backButton}>
        <div className="p-8 text-center text-muted-foreground">Loading appointment...</div>
      </AppLayout>
    );
  }

  if (appointmentQuery.isError) {
    return (
      <AppLayout title="Appointment" titleHref={null} headerStart={backButton}>
        <div className="px-5 pt-4">
          <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
            {getErrorMessage(appointmentQuery.error)}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!appointment) {
    return (
      <AppLayout title="Appointment" titleHref={null} headerStart={backButton}>
        <div className="p-8 text-center text-muted-foreground">Appointment not found.</div>
      </AppLayout>
    );
  }

  const statusTone = getAppointmentTone(appointment);
  const appointmentDate = toDateInputValue(appointment.scheduledFor);
  const notes = appointment.notes.trim();
  const petMetadata = [getPetTypeLabel(appointment.pet.species), appointment.pet.breed || "No breed", titleCase(appointment.pet.sex)];
  const actions = (
    <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-card">
      <div className="grid gap-3 grid-cols-2">
        {appointment.status === "SCHEDULED" ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              disabled={updateStatus.isPending}
              className="px-3"
              onClick={() => updateStatus.mutate("MISSED")}
            >
              {updateStatus.isPending ? "Updating..." : "Mark Missed"}
            </Button>
            <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="ghost" size="lg" disabled={updateStatus.isPending} className="px-3">
                  Cancel
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark the appointment as cancelled and remove it from the active schedule. You can still reopen it from the patient profile if you need to review it later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={updateStatus.isPending}>Keep appointment</AlertDialogCancel>
                  <AlertDialogAction onClick={() => updateStatus.mutate("CANCELLED")} disabled={updateStatus.isPending}>
                    {updateStatus.isPending ? "Cancelling..." : "Yes, cancel"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button asChild variant="outline" size="lg" className="px-3">
              <Link to={`/appointments/${appointment.id}/edit`} state={{ from: returnTo }}>
                Reschedule
              </Link>
            </Button>
            <Button asChild variant="hero" size="lg" className="px-3">
              <Link to={`/pets/${appointment.pet.id}/visits/new?appointmentId=${appointment.id}`} state={{ from: returnTo }}>
                Record Visit
              </Link>
            </Button>
          </>
        ) : appointment.status === "MISSED" ? (
          <>
            <Button asChild variant="outline" size="lg" className="px-3">
              <Link to={`/appointments/${appointment.id}/edit`} state={{ from: returnTo }}>
                Reschedule
              </Link>
            </Button>
            <Button asChild variant="hero" size="lg" className="px-3">
              <Link to={`/pets/${appointment.pet.id}/visits/new?appointmentId=${appointment.id}`} state={{ from: returnTo }}>
                Record Visit
              </Link>
            </Button>
          </>
        ) : appointment.status === "CANCELLED" ? (
          <>
            <Button asChild variant="hero" size="lg" className="px-3">
              <Link to={`/appointments/${appointment.id}/edit`} state={{ from: returnTo }}>
                Reschedule
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-3">
              <Link to={`/calendar?date=${appointmentDate}`}>Back to Day</Link>
            </Button>
          </>
        ) : (
          <>
            <Button asChild variant="outline" size="lg" className="px-3">
              <Link to={`/calendar?date=${appointmentDate}`}>Back to Day</Link>
            </Button>
            <Button asChild variant="hero" size="lg" className="px-3">
              <Link to={`/pets/${appointment.pet.id}`}>Open Pet Profile</Link>
            </Button>
          </>
        )}
      </div>
    </section>
  );

  return (
    <AppLayout title="Appointment" titleHref={null} headerStart={backButton}>
      <div className="space-y-4 px-5 pb-6 pt-4">
        <section className="index-card bg-gradient-to-br from-card via-card to-primary-soft/60">
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <CalendarClock className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="label-eyebrow">Appointment details</div>
              <h1 className="mt-1 font-display text-2xl font-bold leading-tight">{appointment.reason}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge tone={statusTone} icon>
                  {getAppointmentLabel(appointment)}
                </StatusBadge>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-4 border-t border-border/60 pt-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-card/80 text-primary shadow-card">
                <Calendar className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="label-eyebrow">Scheduled for</div>
                <div className="mt-1 text-sm font-semibold text-foreground">{formatDateTime(appointment.scheduledFor)}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-card/80 text-primary shadow-card">
                <UserRound className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="label-eyebrow">Booked by</div>
                <div className="mt-1 text-sm font-semibold text-foreground">{appointment.createdBy.fullName}</div>
                <div className="text-xs text-muted-foreground">{formatRole(appointment.createdBy.role)}</div>
              </div>
            </div>

            {notes ? (
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-card/80 text-primary shadow-card">
                  <StickyNote className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="label-eyebrow">Booking Notes</div>
                  <div className="mt-1 text-sm whitespace-pre-wrap text-foreground">{notes}</div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="index-card bg-gradient-to-br from-card via-card to-primary-soft/60">
          <div className="flex items-center gap-4">
            {appointment.pet.avatarUrl ? (
              <img
                src={appointment.pet.avatarUrl}
                alt={appointment.pet.name}
                className="size-20 shrink-0 rounded-3xl border-2 border-background/80 object-cover shadow-card"
              />
            ) : (
              <div
                className={`flex size-20 shrink-0 items-center justify-center rounded-3xl text-lg font-bold shadow-soft ${getPetAccent(appointment.pet.species)}`}
              >
                {getInitials(appointment.pet.name) || <PawPrint className="size-9" />}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="label-eyebrow">Patient</div>
              <div className="font-display text-2xl font-bold leading-tight">{appointment.pet.name}</div>
              <div className="mt-3 flex flex-wrap items-center gap-1 text-[10.5px] text-foreground">
                {petMetadata.map((value, index) => (
                  <span key={`${appointment.pet.id}-${value}-${index}`} className="rounded-full bg-card/80 px-2.5 py-1 font-medium shadow-card">
                    {value}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3" /> {getPetAgeLabel(appointment.pet.birthDate, appointment.pet.ageLabel)}
                </span>
                <span className="text-border">|</span>
                <span className="inline-flex items-center gap-1">
                  <span
                    className="size-2.5 rounded-full ring-1 ring-border/80"
                    style={{ backgroundColor: getPetColorSwatch(appointment.pet.color) }}
                  />
                  {appointment.pet.color || "No color"}
                </span>
                <span className="text-border">|</span>
                <span className="truncate">{formatWeightKg(appointment.pet.weightKg)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-card/80 px-4 py-3 shadow-card">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <UserRound className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="label-eyebrow">Owner</div>
                <div className="truncate text-sm font-semibold">{appointment.pet.owner.fullName}</div>
                <div className="break-words text-xs text-muted-foreground">{formatPhoneForDisplay(appointment.pet.owner.mobile)}</div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold">
                  <a
                    href={`tel:${toPhoneHref(appointment.pet.owner.mobile)}`}
                    className="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
                  >
                    <Phone className="size-3.5" /> Call owner
                  </a>
                  <Link
                    to={`/pets/${appointment.pet.id}`}
                    className="inline-flex items-center text-primary transition-colors hover:text-primary/80"
                  >
                    Open Pet Profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
        {actions}
      </div>
    </AppLayout>
  );
}
