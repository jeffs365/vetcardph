import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, ChevronLeft, ClipboardList, Pencil, Pill, Scale, Stethoscope, Trash2, UserRound } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { apiRequest, type PetDetail } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { formatDate, formatRole, formatWeightKg, getErrorMessage } from "@/lib/format";
import { readReturnTo } from "@/lib/navigation";

function renderText(value: string | null | undefined, emptyLabel: string) {
  return value?.trim() ? value : emptyLabel;
}

export default function VisitDetail() {
  const { id = "", visitId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token } = useSession();
  const returnTo = readReturnTo(location.state) ?? `/pets/${id}`;
  const [confirmDelete, setConfirmDelete] = useState(false);

  const petQuery = useQuery({
    queryKey: ["pet", id],
    queryFn: () => apiRequest<{ pet: PetDetail }>(`/pets/${id}`, { token }),
    enabled: Boolean(token && id),
  });

  const visit = petQuery.data?.pet.visits.find((record) => record.id === visitId) ?? null;

  const deleteVisit = useMutation({
    mutationFn: () => apiRequest(`/visits/${visitId}`, { method: "DELETE", token }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pet", id] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["visits"] });
      if (visit?.appointmentId) {
        await queryClient.invalidateQueries({ queryKey: ["appointment", visit.appointmentId] });
        await queryClient.invalidateQueries({ queryKey: ["appointments"] });
        await queryClient.invalidateQueries({ queryKey: ["appointment-summary"] });
      }
      navigate(returnTo, { replace: true });
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

  if (petQuery.isLoading) {
    return (
      <AppLayout title="Visit Record" titleHref={null} headerStart={backButton}>
        <div className="p-8 text-center text-muted-foreground">Loading visit record...</div>
      </AppLayout>
    );
  }

  if (petQuery.isError) {
    return (
      <AppLayout title="Visit Record" titleHref={null} headerStart={backButton}>
        <div className="px-5 pt-4">
          <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
            {getErrorMessage(petQuery.error)}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!petQuery.data || !visit) {
    return (
      <AppLayout title="Visit Record" titleHref={null} headerStart={backButton}>
        <div className="p-8 text-center text-muted-foreground">Visit record not found.</div>
      </AppLayout>
    );
  }

  const pet = petQuery.data.pet;

  return (
    <AppLayout
      title="Visit Record"
      titleHref={null}
      headerStart={backButton}
      headerEnd={
        visit.recordedHere ? (
          <Link
            to={`/pets/${pet.id}/visits/${visit.id}/edit`}
            state={{ from: returnTo }}
            aria-label="Edit visit"
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-4" />
          </Link>
        ) : undefined
      }
    >
      <div className="space-y-5 px-5 pb-8 pt-4">
        <section className="index-card bg-gradient-to-br from-card via-card to-primary-soft/60">
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <CalendarClock className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="label-eyebrow">Visit</div>
              <h1 className="mt-1 font-display text-2xl font-bold leading-tight">{visit.reasonForVisit}</h1>
              <div className="mt-2 text-sm text-muted-foreground">
                {pet.name} · {formatDate(visit.visitDate)}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge tone={visit.diagnosis ? "info" : "neutral"}>
                  {visit.diagnosis ? "Diagnosis logged" : "Visit recorded"}
                </StatusBadge>
                {!visit.recordedHere ? <StatusBadge tone="neutral">{visit.sourceLabel}</StatusBadge> : null}
                <StatusBadge tone="neutral">{formatRole(visit.attendedBy.role)}</StatusBadge>
              </div>
            </div>
          </div>
        </section>

        <section className="index-card">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <UserRound className="size-4" />
            </span>
            <h2 className="font-display text-lg font-semibold">Visit summary</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-secondary/60 px-4 py-3">
              <div className="label-eyebrow">Attended by</div>
              <div className="mt-1 text-sm font-semibold">{visit.attendedBy.fullName}</div>
              <div className="text-xs text-muted-foreground">{formatRole(visit.attendedBy.role)}</div>
            </div>
            <div className="rounded-2xl bg-secondary/60 px-4 py-3">
              <div className="label-eyebrow">Diagnosis</div>
              <div className="mt-1 text-sm font-semibold">{renderText(visit.diagnosis, "No diagnosis recorded")}</div>
            </div>
            <div className="rounded-2xl bg-secondary/60 px-4 py-3">
              <div className="label-eyebrow">Visit weight</div>
              <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
                <Scale className="size-4 text-primary" />
                {visit.weightKg ? formatWeightKg(visit.weightKg) : "Not recorded"}
              </div>
            </div>
          </div>
        </section>

        <section className="index-card">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Stethoscope className="size-4" />
            </span>
            <h2 className="font-display text-lg font-semibold">Clinical findings</h2>
          </div>
          <div className="rounded-2xl bg-secondary/40 px-4 py-4 text-sm text-foreground whitespace-pre-wrap">
            {renderText(visit.findingsNotes, "No findings recorded.")}
          </div>
        </section>

        <section className="index-card">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Pill className="size-4" />
            </span>
            <h2 className="font-display text-lg font-semibold">Treatment & follow-up</h2>
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl bg-secondary/40 px-4 py-4">
              <div className="label-eyebrow">Treatment given</div>
              <div className="mt-2 text-sm text-foreground whitespace-pre-wrap">
                {renderText(visit.treatmentGiven, "No treatment recorded.")}
              </div>
            </div>
            <div className="rounded-2xl bg-secondary/40 px-4 py-4">
              <div className="label-eyebrow">Follow-up</div>
              <div className="mt-2 text-sm text-foreground whitespace-pre-wrap">
                {renderText(visit.followUpNotes, "No follow-up instructions recorded.")}
              </div>
            </div>
          </div>
        </section>

        <section className="index-card">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <ClipboardList className="size-4" />
            </span>
            <h2 className="font-display text-lg font-semibold">Next steps</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              to={`/pets/${pet.id}`}
              className="rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm font-semibold transition-colors hover:border-primary/40"
            >
              Open Pet Profile
            </Link>
            <Link
              to={`/pets/${pet.id}/visits/new`}
              className="rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm font-semibold transition-colors hover:border-primary/40"
            >
              Record New Visit
            </Link>
          </div>
        </section>

        {visit.recordedHere ? (
          <section className="index-card border-destructive/20">
            {deleteVisit.isError ? (
              <p className="mb-3 text-xs font-medium text-destructive">{getErrorMessage(deleteVisit.error)}</p>
            ) : null}
            {confirmDelete ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Delete this visit record permanently?</p>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleteVisit.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => deleteVisit.mutate()}
                    disabled={deleteVisit.isPending}
                  >
                    {deleteVisit.isPending ? "Deleting..." : "Yes, delete"}
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 text-sm font-semibold text-destructive/70 hover:text-destructive transition-colors"
              >
                <Trash2 className="size-4" />
                Delete this visit record
              </button>
            )}
          </section>
        ) : null}
      </div>
    </AppLayout>
  );
}
