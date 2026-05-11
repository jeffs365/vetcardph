import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CalendarClock,
  ClipboardList,
  Clock3,
  HeartPulse,
  Heart,
  Home,
  LogIn,
  PawPrint,
  Phone,
  Pill,
  QrCode,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Syringe,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { BrandMark, BrandWordmark } from "@/components/BrandLockup";
import { Button } from "@/components/ui/button";
import { apiRequest, type OwnerPreventiveRecord, type PublicEmergencyShare, type PublicFullProfileShare } from "@/lib/api";
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
  toPhoneHref,
} from "@/lib/format";

type PublicSharePayload =
  | { share: PublicEmergencyShare }
  | { share: PublicFullProfileShare };

function getPublicPreventiveIcon(record: OwnerPreventiveRecord) {
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

function getPublicPreventiveLabel(record: OwnerPreventiveRecord) {
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

export default function PublicShare() {
  const { publicToken = "" } = useParams();

  const shareQuery = useQuery({
    queryKey: ["public-share", publicToken],
    queryFn: () => apiRequest<PublicSharePayload>(`/share/${publicToken}`),
    enabled: Boolean(publicToken),
    retry: false,
  });

  const share = shareQuery.data?.share;
  const fullShare = share?.type === "FULL_PROFILE" ? share : null;
  const emergencyShare = share?.type === "EMERGENCY" ? share : null;
  const fullSummary = useMemo(() => {
    if (!fullShare) {
      return null;
    }

    return {
      nextAppointment: fullShare.pet.appointments.find((appointment) => appointment.status === "SCHEDULED") ?? null,
      latestVisit: fullShare.pet.visits[0],
      latestPreventive: fullShare.pet.preventiveRecords[0],
      nextPreventiveDue: [...fullShare.pet.preventiveRecords]
        .filter((record) => Boolean(record.nextDueDate))
        .sort((left, right) => new Date(left.nextDueDate ?? 0).getTime() - new Date(right.nextDueDate ?? 0).getTime())[0],
    };
  }, [fullShare]);

  return (
    <div className="app-shell">
      <div className="app-canvas">
        <main className="flex-1 overflow-y-auto">
          <header className="flex items-center justify-between gap-3 border-b border-border/60 bg-card/70 px-5 py-3 backdrop-blur">
            <Link to="/" className="flex items-center gap-2" aria-label="VetCard home">
              <BrandMark className="size-7 rounded-[0.8rem] shadow-none" />
              <BrandWordmark compact className="text-lg" />
            </Link>
            <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Shared record
            </span>
          </header>
          {shareQuery.isLoading ? (
            <div className="space-y-5 px-5 pb-10 pt-6">
              <div className="index-card">
                <div className="flex items-start gap-4">
                  <div className="size-20 shrink-0 rounded-3xl bg-muted animate-pulse" />
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                    <div className="h-7 w-40 rounded bg-muted animate-pulse" />
                    <div className="flex gap-2">
                      <div className="h-5 w-14 rounded-full bg-muted animate-pulse" />
                      <div className="h-5 w-10 rounded-full bg-muted animate-pulse" />
                      <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="index-card space-y-2">
                <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                <div className="h-3 w-32 rounded bg-muted animate-pulse" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="index-card space-y-4">
                    <div className="size-11 rounded-2xl bg-muted animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                      <div className="h-6 w-28 rounded bg-muted animate-pulse" />
                      <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : shareQuery.isError ? (
            <div className="space-y-5 px-5 pb-10 pt-8">
              <section className="relative overflow-hidden rounded-[1.75rem] border border-primary/10 bg-gradient-to-br from-card via-card to-primary-soft/60 p-5 shadow-card">
                <div className="relative flex items-start gap-4">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-card text-primary shadow-card">
                    <QrCode className="size-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="label-eyebrow text-tertiary">QR needs a refresh</div>
                    <h1 className="mt-2 font-display text-2xl font-bold text-primary">This VetCard link is not active</h1>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {getErrorMessage(shareQuery.error)}
                    </p>
                  </div>
                </div>
              </section>

              <section className="index-card space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  For privacy, shared VetCards can expire or be revoked. Ask the owner to create a fresh QR when you still need the record.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button asChild size="lg" variant="hero" className="rounded-xl">
                    <Link to="/owner/home">
                      <Home className="size-4" /> Open VetCard
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="rounded-xl border-primary text-primary hover:bg-primary/5 hover:text-primary">
                    <Link to="/owner/login">
                      <LogIn className="size-4" /> Owner sign in
                    </Link>
                  </Button>
                </div>
              </section>
            </div>
          ) : emergencyShare ? (
            <div className="space-y-5 px-5 pb-10 pt-6">
              <section className="index-card bg-gradient-to-br from-card via-card to-primary-soft/60">
                <div className="flex items-start gap-4">
                  <div className="flex size-20 items-center justify-center rounded-[1.75rem] bg-gradient-primary text-primary-foreground shadow-float">
                    <Heart className="size-9" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="label-eyebrow text-tertiary">Emergency pet card</div>
                    <h1 className="mt-2 font-display text-3xl font-bold text-primary">{emergencyShare.pet.name}</h1>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-card/80 px-3 py-1">{getPetTypeLabel(emergencyShare.pet.species)}</span>
                      <span className="rounded-full bg-card/80 px-3 py-1">{titleCase(emergencyShare.pet.sex)}</span>
                      <span className="rounded-full bg-card/80 px-3 py-1">{getPetAgeLabel(emergencyShare.pet.birthDate, emergencyShare.pet.ageLabel)}</span>
                    </div>
                  </div>
                </div>
              </section>

              {(emergencyShare.pet.allergies ?? []).length || (emergencyShare.pet.medications ?? []).length || (emergencyShare.pet.dietNotes ?? []).length ? (
                <section className="index-card">
                  <div className="label-eyebrow">Critical health notes</div>
                  <div className="mt-4 space-y-3">
                    {(emergencyShare.pet.allergies ?? []).map((item) => (
                      <PublicHealthNote key={item.id} icon={AlertTriangle} label="Allergy" title={item.allergen} detail={[item.severity, item.reaction, item.notes].filter(Boolean).join(" · ") || "No allergy details."} />
                    ))}
                    {(emergencyShare.pet.medications ?? []).map((item) => (
                      <PublicHealthNote key={item.id} icon={Pill} label="Medication" title={item.name} detail={[item.dose, item.frequency, item.route, item.notes].filter(Boolean).join(" · ") || "No medication details."} />
                    ))}
                    {(emergencyShare.pet.dietNotes ?? []).map((item) => (
                      <PublicHealthNote key={item.id} icon={ClipboardList} label="Diet" title={item.dietName} detail={item.remarks || "No diet details."} />
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="index-card">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    <Phone className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">Emergency contact</div>
                    <div className="text-sm text-muted-foreground">{emergencyShare.emergencyContact.fullName}</div>
                  </div>
                </div>
                <a
                  href={`tel:${toPhoneHref(emergencyShare.emergencyContact.mobile)}`}
                  className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-primary px-5 text-base font-semibold text-primary-foreground"
                >
                  Call {formatPhoneForDisplay(emergencyShare.emergencyContact.mobile)}
                </a>
              </section>

              {emergencyShare.linkedClinics.length ? (
                <section className="index-card">
                  <div className="label-eyebrow">Linked clinics</div>
                  <div className="mt-4 space-y-3">
                    {emergencyShare.linkedClinics.map((clinic) => (
                      <div key={clinic.id} className="rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-card">
                        <div className="font-semibold">{clinic.name}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{clinic.phone ? formatPhoneForDisplay(clinic.phone) : "No clinic phone listed"}</div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="index-card">
                <div className="label-eyebrow">Pet details</div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <InfoTile label="Breed" value={emergencyShare.pet.breed || "Not set"} />
                  <InfoTile label="Weight" value={formatWeightKg(emergencyShare.pet.weightKg)} />
                  <InfoTile label="Color" value={emergencyShare.pet.color || "Not set"} />
                  <InfoTile label="Linked clinics" value={`${emergencyShare.linkedClinics.length}`} />
                </div>
              </section>
            </div>
          ) : fullShare && fullSummary ? (
            <div className="space-y-5 px-5 pb-10 pt-6">
              <section className="relative overflow-hidden rounded-[1.75rem] border border-primary/10 bg-gradient-to-br from-card via-card to-primary-soft/70 p-5 shadow-card">
                <div className="relative flex items-center gap-4">
                  {fullShare.pet.avatarUrl ? (
                    <img
                      src={fullShare.pet.avatarUrl}
                      alt={fullShare.pet.name}
                      className="size-24 rounded-3xl border-2 border-background/80 object-cover shadow-card"
                    />
                  ) : (
                    <div className="flex size-24 items-center justify-center rounded-3xl bg-card text-primary shadow-float">
                      <PawPrint className="size-11" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="label-eyebrow text-primary">Shared VetCard</div>
                    <h1 className="mt-2 line-clamp-2 font-display text-2xl font-bold tracking-tight leading-tight">
                      {fullShare.pet.name}
                    </h1>
                    <div className="mt-3 flex flex-wrap items-center gap-1 text-[10.5px] text-foreground">
                      {[getPetTypeLabel(fullShare.pet.species), fullShare.pet.breed || "No breed", titleCase(fullShare.pet.sex)].map((value, index) => (
                        <span key={`${fullShare.pet.id}-${value}-${index}`} className="rounded-full bg-card/80 px-2.5 py-1 font-medium shadow-card">
                          {value}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="size-3" /> {getPetAgeLabel(fullShare.pet.birthDate, fullShare.pet.ageLabel)}
                      </span>
                      <span className="text-border">|</span>
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="size-2.5 rounded-full ring-1 ring-border/80"
                          style={{ backgroundColor: getPetColorSwatch(fullShare.pet.color) }}
                        />
                        {fullShare.pet.color || "No color"}
                      </span>
                      <span className="text-border">|</span>
                      <span>{formatWeightKg(fullShare.pet.weightKg)}</span>
                    </div>
                  </div>
                </div>
              </section>

              {fullShare.expiresAt ? (
                <ShareExpiryBanner expiresAt={fullShare.expiresAt} />
              ) : null}

              <section className="rounded-[1.5rem] border border-tertiary/15 bg-tertiary-soft/55 p-4 shadow-card">
                <div className="label-eyebrow text-tertiary">Pet owner</div>
                <div className="mt-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{fullShare.pet.owner.fullName}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{formatPhoneForDisplay(fullShare.pet.owner.mobile)}</div>
                    {fullShare.pet.owner.email ? <div className="mt-1 truncate text-sm text-muted-foreground">{fullShare.pet.owner.email}</div> : null}
                    {fullShare.pet.owner.address ? <div className="mt-1 text-sm text-muted-foreground">{fullShare.pet.owner.address}</div> : null}
                  </div>
                  <a
                    href={`tel:${toPhoneHref(fullShare.pet.owner.mobile)}`}
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-tertiary text-tertiary-foreground shadow-[0_14px_28px_-18px_hsl(var(--tertiary)_/_0.75)]"
                    aria-label={`Call ${fullShare.pet.owner.fullName}`}
                  >
                    <Phone className="size-5" />
                  </a>
                </div>
              </section>

              <section className="grid grid-cols-2 gap-3 [&>*:last-child]:col-span-2">
                <SnapshotCard
                  icon={CalendarClock}
                  label="Next Appointment"
                  value={fullSummary.nextAppointment ? formatDate(fullSummary.nextAppointment.scheduledFor) : "Not scheduled"}
                  detail={fullSummary.nextAppointment ? `${formatTime(fullSummary.nextAppointment.scheduledFor)} · ${fullSummary.nextAppointment.reason}` : "No schedule"}
                />
                <SnapshotCard
                  icon={Stethoscope}
                  label="Last Visit"
                  value={fullSummary.latestVisit ? formatDate(fullSummary.latestVisit.visitDate) : "No visits yet"}
                  detail={fullSummary.latestVisit ? fullSummary.latestVisit.reasonForVisit : "No history yet"}
                />
                <SnapshotCard
                  icon={ShieldCheck}
                  label="Latest Care Item"
                  value={fullSummary.latestPreventive ? fullSummary.latestPreventive.careType.name : "No record yet"}
                  detail={fullSummary.latestPreventive ? `${formatDate(fullSummary.latestPreventive.administeredOn)} · ${fullSummary.latestPreventive.clinicName}` : "No care yet"}
                />
              </section>

              {(fullShare.pet.allergies ?? []).length || (fullShare.pet.medications ?? []).length || (fullShare.pet.dietNotes ?? []).length ? (
                <section className="index-card">
                  <div className="label-eyebrow">Health notes</div>
                  <div className="mt-4 space-y-3">
                    {(fullShare.pet.allergies ?? []).map((item) => (
                      <PublicHealthNote key={item.id} icon={AlertTriangle} label="Allergy" title={item.allergen} detail={[item.severity, item.reaction, item.notes].filter(Boolean).join(" · ") || "No allergy details."} />
                    ))}
                    {(fullShare.pet.medications ?? []).map((item) => (
                      <PublicHealthNote key={item.id} icon={Pill} label="Medication" title={item.name} detail={[item.dose, item.frequency, item.route, item.notes].filter(Boolean).join(" · ") || "No medication details."} />
                    ))}
                    {(fullShare.pet.dietNotes ?? []).map((item) => (
                      <PublicHealthNote key={item.id} icon={ClipboardList} label="Diet" title={item.dietName} detail={item.remarks || "No diet details."} />
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="rounded-[1.5rem] border border-primary/10 bg-card p-5 shadow-card">
                <div className="label-eyebrow">Digital health booklet</div>
                <div className="mt-4 space-y-4">
                  {fullShare.pet.visits.length ? (
                    <div>
                      <div className="mb-2 label-eyebrow">Visits</div>
                      <div className="space-y-3">
                        {fullShare.pet.visits.slice(0, 3).map((visit) => (
                          <PublicBookletCard
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

                  {fullShare.pet.preventiveRecords.length ? (
                    <div>
                      <div className="mb-2 label-eyebrow">Preventive care</div>
                      <div className="space-y-3">
                        {fullShare.pet.preventiveRecords.slice(0, 4).map((record) => (
                          <PublicBookletCard
                            key={record.id}
                            icon={getPublicPreventiveIcon(record)}
                            label={getPublicPreventiveLabel(record)}
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

                  {!fullShare.pet.visits.length && !fullShare.pet.preventiveRecords.length ? (
                    <div className="rounded-2xl border border-dashed border-primary/20 bg-primary-soft/25 p-6 text-center text-sm text-muted-foreground">
                      <div className="font-semibold text-foreground">No shared medical history yet.</div>
                      <p className="mt-1">Clinic visits and care records will appear here after they are added to VetCard.</p>
                    </div>
                  ) : null}
                  </div>
              </section>

              <ClinicAcquisitionCta />
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function ShareExpiryBanner({ expiresAt }: { expiresAt: string }) {
  const expires = new Date(expiresAt);
  const msRemaining = expires.getTime() - Date.now();
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
  const isUrgent = daysRemaining <= 3;

  const remainingLabel =
    daysRemaining <= 0
      ? "Expires today"
      : daysRemaining === 1
        ? "Expires in 1 day"
        : `Expires in ${daysRemaining} days`;

  return (
    <section
      className={
        isUrgent
          ? "flex items-center gap-3 rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 shadow-card"
          : "flex items-center gap-3 rounded-2xl border border-tertiary/20 bg-tertiary-soft/40 px-4 py-3 shadow-card"
      }
    >
      <div
        className={
          isUrgent
            ? "flex size-9 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive"
            : "flex size-9 shrink-0 items-center justify-center rounded-xl bg-card text-tertiary"
        }
      >
        <Clock3 className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className={isUrgent ? "text-sm font-semibold text-destructive" : "text-sm font-semibold text-foreground"}>
          {remainingLabel}
        </div>
        <div className="text-xs text-muted-foreground">Valid through {formatDateTime(expiresAt)}</div>
      </div>
    </section>
  );
}

function ClinicAcquisitionCta() {
  return (
    <section className="relative overflow-hidden rounded-[1.5rem] border border-primary/15 bg-gradient-to-br from-primary-soft/70 via-card to-card p-5 shadow-card">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-card text-primary shadow-card">
          <Sparkles className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="label-eyebrow text-primary">For the clinic viewing this</div>
          <h2 className="mt-1 font-display text-lg font-bold leading-snug text-foreground">
            Give every pet you treat a VetCard.
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Replace paper index cards with a fast, searchable record your team can pull up in seconds. Free to start.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="hero" className="rounded-xl">
              <Link to="/clinic/register">
                Get VetCard for your clinic <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-xl border-primary/30 text-primary hover:bg-primary/5 hover:text-primary">
              <Link to="/clinic/login">Clinic sign in</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
      <div className="label-eyebrow">{label}</div>
      <div className="mt-1 font-semibold text-foreground">{value}</div>
    </div>
  );
}

function PublicHealthNote({
  icon: Icon,
  label,
  title,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="label-eyebrow">{label}</div>
          <div className="mt-1 text-sm font-semibold">{title}</div>
          <div className="mt-2 text-sm text-muted-foreground">{detail}</div>
        </div>
      </div>
    </div>
  );
}

function PublicBookletCard({
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
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-card text-primary shadow-card">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="label-eyebrow">{label}</div>
          <div className="mt-1 truncate text-sm font-semibold">{title}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{meta}</div>
          <div className="mt-2 text-sm text-muted-foreground">{detail}</div>
        </div>
      </div>
    </div>
  );
}

function SnapshotCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof CalendarClock;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="index-card">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Icon className="size-5" />
      </div>
      <div className="mt-4">
        <div className="label-eyebrow">{label}</div>
        <div className="mt-2 font-display text-lg font-bold text-primary">{value}</div>
        <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
      </div>
    </div>
  );
}
