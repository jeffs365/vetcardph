import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Calendar,
  CalendarClock,
  ChevronLeft,
  ClipboardList,
  HeartPulse,
  MessageSquare,
  PawPrint,
  Pill,
  QrCode,
  ShieldCheck,
  SquarePen,
  Stethoscope,
  Syringe,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import OwnerLayout from "@/components/OwnerLayout";
import { Button } from "@/components/ui/button";
import { apiRequest, type OwnerPetDetail, type OwnerPreventiveRecord } from "@/lib/api";
import {
  formatDate,
  formatDateTime,
  formatPhoneForDisplay,
  formatTime,
  formatWeightKg,
  getErrorMessage,
  getPetAgeLabel,
  getPetColorSwatch,
  getPetTypeLabel,
  getPreventiveRecordSourceLabel,
  titleCase,
} from "@/lib/format";
import { useOwnerSession } from "@/lib/owner-auth";

function getOwnerPreventiveIcon(record: OwnerPreventiveRecord) {
  if (record.careType.category === "VACCINATION") {
    return Syringe;
  }

  if (record.careType.category === "DEWORMING") {
    return Pill;
  }

  if (record.careType.category === "HEARTWORM") {
    return HeartPulse;
  }

  return ShieldCheck;
}

function getOwnerPreventiveLabel(record: OwnerPreventiveRecord) {
  if (record.careType.category === "VACCINATION") {
    return "Vaccine";
  }

  if (record.careType.category === "DEWORMING") {
    return "Deworming";
  }

  if (record.careType.category === "HEARTWORM") {
    return "Heartworm";
  }

  return "Care item";
}

export default function OwnerPetProfile() {
  const { token } = useOwnerSession();
  const { id = "" } = useParams();

  const petQuery = useQuery({
    queryKey: ["owner-pet", id],
    queryFn: () => apiRequest<{ pet: OwnerPetDetail }>(`/owner/pets/${id}`, { token }),
    enabled: Boolean(token && id),
  });

  if (petQuery.isLoading) {
    return (
      <OwnerLayout
        title="Pet Profile"
        titleHref={null}
        headerStart={
          <Link
            to="/owner/pets"
            aria-label="Back to pets"
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="size-5" />
          </Link>
        }
      >
        <div className="p-8 text-center text-muted-foreground">Loading pet profile...</div>
      </OwnerLayout>
    );
  }

  if (petQuery.isError) {
    return (
      <OwnerLayout
        title="Pet Profile"
        titleHref={null}
        headerStart={
          <Link
            to="/owner/pets"
            aria-label="Back to pets"
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="size-5" />
          </Link>
        }
      >
        <div className="px-5 pt-4">
          <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
            {getErrorMessage(petQuery.error)}
          </div>
        </div>
      </OwnerLayout>
    );
  }

  if (!petQuery.data) {
    return (
      <OwnerLayout
        title="Pet Profile"
        titleHref={null}
        headerStart={
          <Link
            to="/owner/pets"
            aria-label="Back to pets"
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="size-5" />
          </Link>
        }
      >
        <div className="p-8 text-center text-muted-foreground">Pet not found.</div>
      </OwnerLayout>
    );
  }

  const pet = petQuery.data.pet;
  const nextAppointment = pet.appointments.find((appointment) => appointment.status === "SCHEDULED") ?? null;
  const latestVisit = pet.visits[0];
  const latestPreventive = pet.preventiveRecords[0];
  const petAllergies = pet.allergies ?? [];
  const petMedications = pet.medications ?? [];
  const petDietNotes = pet.dietNotes ?? [];
  const activeHealthNoteCount = petAllergies.length + petMedications.length + petDietNotes.length;
  const nextPreventiveDue = [...pet.preventiveRecords]
    .filter((record) => Boolean(record.nextDueDate))
    .sort((left, right) => new Date(left.nextDueDate ?? 0).getTime() - new Date(right.nextDueDate ?? 0).getTime())[0];
  const metadataChips = [getPetTypeLabel(pet.species), pet.breed || "No breed", titleCase(pet.sex)];

  return (
    <OwnerLayout
      title="Pet Profile"
      titleHref={null}
      headerStart={
        <Link
          to="/owner/pets"
          aria-label="Back to pets"
          className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
      }
      headerEnd={
        <div className="flex items-center gap-1">
          <Link
            to={`/owner/pets/${pet.id}/edit`}
            aria-label="Edit pet profile"
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <SquarePen className="size-4" />
          </Link>
          <Link
            to="/owner/share"
            aria-label="Open share hub"
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <QrCode className="size-4" />
          </Link>
        </div>
      }
    >
      <div className="space-y-5 px-5 pb-8 pt-4">
        <section className="relative overflow-hidden rounded-[1.75rem] border border-primary/10 bg-gradient-to-br from-card via-card to-primary-soft/70 p-5 shadow-card">
          <div className="relative flex items-center gap-4">
            {pet.avatarUrl ? (
              <img src={pet.avatarUrl} alt={pet.name} className="size-24 rounded-3xl border-2 border-background/80 object-cover shadow-card" />
            ) : (
              <div className="flex size-24 items-center justify-center rounded-3xl bg-card text-primary shadow-float">
                <PawPrint className="size-11" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="line-clamp-2 font-display text-2xl font-bold tracking-tight leading-tight">{pet.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-1 text-[10.5px] text-foreground">
                {metadataChips.map((value, index) => (
                  <span key={`${pet.id}-${value}-${index}`} className="rounded-full bg-card/80 px-2.5 py-1 font-medium shadow-card">
                    {value}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3" /> {getPetAgeLabel(pet.birthDate, pet.ageLabel)}
                </span>
                <span className="text-border">|</span>
                <span className="inline-flex items-center gap-1">
                  <span
                    className="size-2.5 rounded-full ring-1 ring-border/80"
                    style={{ backgroundColor: getPetColorSwatch(pet.color) }}
                  />
                  {pet.color || "No color"}
                </span>
                <span className="text-border">|</span>
                <span className="truncate">{formatWeightKg(pet.weightKg)}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-tertiary/15 bg-tertiary-soft/60 p-4 shadow-card">
          <div className="mb-3">
            <div className="label-eyebrow text-tertiary">Share VetCard</div>
            <h2 className="mt-1 font-display text-lg font-bold">Ready when a clinic needs it</h2>
          </div>
          <div className="grid gap-3">
          <Button asChild size="lg" className="rounded-xl bg-tertiary text-tertiary-foreground shadow-[0_14px_28px_-18px_hsl(var(--tertiary)_/_0.75)] hover:bg-tertiary/90">
            <Link to="/owner/share">
              <QrCode className="size-4" /> Share Full Profile QR
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-xl border-tertiary/40 bg-card text-tertiary hover:bg-tertiary-soft hover:text-tertiary">
            <Link to="/owner/share">
              <ShieldCheck className="size-4" /> Emergency QR
            </Link>
          </Button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <ProfileSnapshotCard
            icon={CalendarClock}
            label="Next Appointment"
            value={nextAppointment ? formatDate(nextAppointment.scheduledFor) : "Not scheduled"}
            detail={nextAppointment ? `${formatTime(nextAppointment.scheduledFor)} · ${nextAppointment.reason}` : "Book the next visit."}
          />
          <ProfileSnapshotCard
            icon={Stethoscope}
            label="Last Visit"
            value={latestVisit ? formatDate(latestVisit.visitDate) : "No visits yet"}
            detail={latestVisit ? latestVisit.reasonForVisit : "Clinic-recorded visits appear here."}
          />
          <ProfileSnapshotCard
            icon={ShieldCheck}
            label="Latest Care Item"
            value={latestPreventive ? latestPreventive.careType.name : "No record yet"}
            detail={latestPreventive ? `${formatDate(latestPreventive.administeredOn)} · ${latestPreventive.clinicName}` : "Open care history."}
          />
          <ProfileSnapshotCard
            icon={Calendar}
            label="Next Care Due"
            value={nextPreventiveDue?.nextDueDate ? formatDate(nextPreventiveDue.nextDueDate) : "Not scheduled"}
            detail={nextPreventiveDue?.nextDueDate ? `${nextPreventiveDue.careType.name} · ${nextPreventiveDue.clinicName}` : "No due reminders yet."}
          />
        </section>

        {activeHealthNoteCount ? (
          <section className="index-card">
            <div className="mb-4">
              <div className="label-eyebrow">Current profile</div>
              <h2 className="mt-1 font-display text-lg font-bold">Health Notes</h2>
              <p className="mt-1 text-sm text-muted-foreground">Active clinic notes that should stay visible between visits.</p>
            </div>
            <div className="space-y-3">
              {petAllergies.map((item) => (
                <OwnerHealthNoteCard
                  key={item.id}
                  icon={AlertTriangle}
                  title={item.allergen}
                  label="Allergy"
                  detail={[item.severity, item.reaction, item.notes].filter(Boolean).join(" · ") || "No additional allergy details."}
                  clinicName={item.clinicName}
                />
              ))}
              {petMedications.map((item) => (
                <OwnerHealthNoteCard
                  key={item.id}
                  icon={Pill}
                  title={item.name}
                  label="Medication"
                  detail={[item.dose, item.frequency, item.route, item.notes].filter(Boolean).join(" · ") || "No medication details."}
                  clinicName={item.clinicName}
                />
              ))}
              {petDietNotes.map((item) => (
                <OwnerHealthNoteCard
                  key={item.id}
                  icon={ClipboardList}
                  title={item.dietName}
                  label="Diet"
                  detail={item.remarks || "No additional diet remarks."}
                  clinicName={item.clinicName}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-[1.5rem] border border-primary/10 bg-card p-5 shadow-card">
          <div className="mb-4">
            <div className="label-eyebrow">Digital health booklet</div>
            <h2 className="mt-1 font-display text-xl font-bold">Pet Record</h2>
            <p className="mt-1 text-sm text-muted-foreground">Clinic-recorded visits and preventive care, organized like the paper booklet.</p>
          </div>

          <div className="space-y-4">
            {pet.visits.length ? (
              <div>
                <div className="mb-2 label-eyebrow">Visits</div>
                <div className="space-y-3">
                  {pet.visits.slice(0, 3).map((visit) => (
                    <OwnerBookletCard
                      key={visit.id}
                      icon={Stethoscope}
                      label="Visit"
                      title={visit.reasonForVisit}
                      meta={`${formatDate(visit.visitDate)} · ${visit.clinicName}${visit.weightKg ? ` · ${formatWeightKg(visit.weightKg)}` : ""}`}
                      detail={visit.diagnosis || visit.treatmentGiven || visit.findingsNotes || "No summary yet."}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {pet.preventiveRecords.length ? (
              <div>
                <div className="mb-2 label-eyebrow">Preventive care</div>
                <div className="space-y-3">
                  {pet.preventiveRecords.slice(0, 4).map((record) => (
                    <OwnerBookletCard
                      key={record.id}
                      icon={getOwnerPreventiveIcon(record)}
                      label={getOwnerPreventiveLabel(record)}
                      title={record.careType.name}
                      meta={`${formatDate(record.administeredOn)} · ${record.clinicName}${
                        record.sourceType === "HISTORICAL_BOOKLET" ? ` · ${getPreventiveRecordSourceLabel(record.sourceType)}` : ""
                      }`}
                      detail={
                        record.nextDueDate
                          ? `Next due ${formatDate(record.nextDueDate)}`
                          : record.productName || record.sourceNote || record.notes || "No additional notes provided."
                      }
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {!pet.visits.length && !pet.preventiveRecords.length ? (
              <div className="rounded-2xl border border-dashed border-primary/20 bg-primary-soft/30 p-6 text-center text-sm text-muted-foreground">
                <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-2xl bg-card text-primary shadow-card">
                  <ClipboardList className="size-5" />
                </div>
                <div className="font-semibold text-foreground">No medical history yet.</div>
                <p className="mt-1">Clinic visits and care records will appear here after they are linked.</p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="index-card">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <div className="label-eyebrow">Linked care</div>
              <h2 className="font-display text-lg font-bold">Clinic Connections</h2>
              <p className="text-sm text-muted-foreground">
                {pet.clinics.length ? `${pet.clinics.length} connected clinic${pet.clinics.length === 1 ? "" : "s"}` : "No clinic connections yet"}
              </p>
            </div>
            <Link to="/owner/share" className="text-sm font-semibold text-tertiary">
              {pet.clinics.length ? "Share" : "Create QR"}
            </Link>
          </div>

          {pet.clinics.length ? (
            <div className="space-y-3">
              {pet.clinics.map((clinic) => (
                <div key={clinic.id} className="rounded-2xl border border-border/70 bg-card p-3.5 shadow-card">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
                      <MessageSquare className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{clinic.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {clinic.phone ? formatPhoneForDisplay(clinic.phone) : "No clinic phone listed"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No clinics linked yet.
            </div>
          )}
        </section>
      </div>
    </OwnerLayout>
  );
}

function ProfileSnapshotCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-3.5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-9 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Icon className="size-4" strokeWidth={2} />
        </span>
      </div>
      <div className="mt-3 label-eyebrow">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

function OwnerHealthNoteCard({
  icon: Icon,
  label,
  title,
  detail,
  clinicName,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  detail: string;
  clinicName: string | null;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="label-eyebrow">{label}</div>
          <div className="mt-1 text-sm font-semibold">{title}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{clinicName ?? "Clinic note"}</div>
          <div className="mt-2 text-sm text-muted-foreground">{detail}</div>
        </div>
      </div>
    </div>
  );
}

function OwnerBookletCard({
  icon: Icon,
  label,
  title,
  meta,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  meta: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-card to-primary-soft/25 p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-card text-primary shadow-card">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="label-eyebrow">{label}</div>
              <div className="mt-1 truncate text-sm font-semibold">{title}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{meta}</div>
            </div>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">{detail}</div>
        </div>
      </div>
    </div>
  );
}
