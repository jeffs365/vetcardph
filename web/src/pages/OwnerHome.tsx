import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Calendar,
  CalendarClock,
  ClipboardList,
  ChevronRight,
  Clock3,
  PawPrint,
  QrCode,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import OwnerLayout from "@/components/OwnerLayout";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { apiRequest, type OwnerPetDetail, type OwnerPetListItem } from "@/lib/api";
import {
  formatDate,
  formatDateTime,
  formatPhoneForDisplay,
  formatWeightKg,
  getErrorMessage,
  getPetAgeLabel,
  getPetColorSwatch,
  getPetTypeLabel,
  titleCase,
} from "@/lib/format";
import { useOwnerSession } from "@/lib/owner-auth";

export default function OwnerHome() {
  const { token, user } = useOwnerSession();
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const petsQuery = useQuery({
    queryKey: ["owner-pets"],
    queryFn: () => apiRequest<{ pets: OwnerPetListItem[] }>("/owner/pets", { token }),
    enabled: Boolean(token),
  });

  const pets = petsQuery.data?.pets ?? [];
  const selectedPet = pets[selectedIndex] ?? null;
  const selectedPetId = selectedPet?.id ?? "";

  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    const syncSelection = () => {
      setSelectedIndex(carouselApi.selectedScrollSnap());
    };

    syncSelection();
    carouselApi.on("select", syncSelection);
    carouselApi.on("reInit", syncSelection);

    return () => {
      carouselApi.off("select", syncSelection);
    };
  }, [carouselApi]);

  useEffect(() => {
    if (!carouselApi || !pets.length) {
      return;
    }

    const maxIndex = pets.length - 1;
    const nextIndex = Math.min(selectedIndex, maxIndex);
    if (carouselApi.selectedScrollSnap() !== nextIndex) {
      carouselApi.scrollTo(nextIndex);
    }
  }, [carouselApi, pets.length, selectedIndex]);

  const petDetailQuery = useQuery({
    queryKey: ["owner-home-pet", selectedPetId],
    queryFn: () => apiRequest<{ pet: OwnerPetDetail }>(`/owner/pets/${selectedPetId}`, { token }),
    enabled: Boolean(token && selectedPetId),
  });

  const pet = petDetailQuery.data?.pet;
  const nextAppointment = pet?.appointments.find((appointment) => appointment.status === "SCHEDULED") ?? null;
  const latestVisit = pet?.visits[0];
  const latestPreventive = pet?.preventiveRecords[0];
  const nextPreventiveDue = useMemo(() => {
    if (!pet) {
      return null;
    }

    return [...pet.preventiveRecords]
      .filter((record) => Boolean(record.nextDueDate))
      .sort((left, right) => new Date(left.nextDueDate ?? 0).getTime() - new Date(right.nextDueDate ?? 0).getTime())[0] ?? null;
  }, [pet]);

  const statusCard = useMemo<StatusCardProps>(() => {
    if (!pet) {
      return {
        kind: "share",
        icon: QrCode,
        eyebrow: "Get started",
        title: "Your VetCard is ready",
        detail: "Records, QR access, and clinic connections all live here.",
        href: "/owner/share",
        tone: "primary",
      };
    }

    if (nextAppointment) {
      const days = daysUntil(nextAppointment.scheduledFor);
      return {
        kind: "appointment",
        icon: CalendarClock,
        eyebrow: "Next appointment",
        title:
          days <= 0
            ? "Visit today"
            : days === 1
              ? "Visit tomorrow"
              : `Visit in ${days} days`,
        detail: `${nextAppointment.clinic.name} · ${formatDateTime(nextAppointment.scheduledFor)}`,
        href: `/owner/pets/${pet.id}`,
        tone: days <= 2 ? "warm" : "primary",
      };
    }

    if (nextPreventiveDue?.nextDueDate) {
      const days = daysUntil(nextPreventiveDue.nextDueDate);
      const overdue = days < 0;
      return {
        kind: "care",
        icon: ShieldCheck,
        eyebrow: overdue ? "Overdue care" : "Care due",
        title: overdue
          ? `${nextPreventiveDue.careType.name} overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`
          : days === 0
            ? `${nextPreventiveDue.careType.name} due today`
            : `${nextPreventiveDue.careType.name} in ${days} day${days === 1 ? "" : "s"}`,
        detail: `Due ${formatDate(nextPreventiveDue.nextDueDate)} · ${nextPreventiveDue.clinicName}`,
        href: `/owner/pets/${pet.id}`,
        tone: overdue ? "danger" : days <= 7 ? "warm" : "primary",
      };
    }

    if (latestVisit) {
      return {
        kind: "visit",
        icon: Stethoscope,
        eyebrow: "All caught up",
        title: "No upcoming visits",
        detail: `Latest visit ${formatDate(latestVisit.visitDate)} · ${latestVisit.clinicName}`,
        href: `/owner/pets/${pet.id}`,
        tone: "primary",
      };
    }

    return {
      kind: "share",
      icon: QrCode,
      eyebrow: "Ready to share",
      title: `Share ${pet.name}'s VetCard`,
      detail: "Hand a clinic the full profile in seconds — no paper card needed.",
      href: "/owner/share",
      tone: "primary",
    };
  }, [latestVisit, nextAppointment, nextPreventiveDue, pet]);

  const firstName = user?.fullName.trim().split(/\s+/)[0] ?? "there";

  return (
    <OwnerLayout title="Home" titleHref={null}>
      {petsQuery.isLoading || (selectedPetId && petDetailQuery.isLoading) ? (
        <div className="px-5 py-10 text-center text-muted-foreground">Loading owner dashboard...</div>
      ) : petsQuery.isError || petDetailQuery.isError ? (
        <div className="px-5 pt-4">
          <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
            {getErrorMessage(petsQuery.error ?? petDetailQuery.error)}
          </div>
        </div>
      ) : pet && selectedPet ? (
        <>
          <section className="px-5 pt-5">
            <div className="mb-3">
              <div className="label-eyebrow text-primary">Good day</div>
              <h1 className="mt-2 font-display text-2xl font-bold">Hi, {firstName}</h1>
            </div>

            <Carousel
              setApi={setCarouselApi}
              opts={{
                align: "start",
                loop: false,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-0">
                {pets.map((petOption) => (
                  <CarouselItem key={petOption.id} className="pl-0">
                    <div className="index-card bg-gradient-to-br from-card via-card to-primary-soft/60">
                      <div className="flex items-center gap-4">
                        {petOption.avatarUrl ? (
                          <img
                            src={petOption.avatarUrl}
                            alt={petOption.name}
                            className="size-20 shrink-0 rounded-[1.75rem] border-2 border-background/80 object-cover shadow-float"
                          />
                        ) : (
                          <div className="flex size-20 shrink-0 items-center justify-center rounded-[1.75rem] bg-gradient-primary text-primary-foreground shadow-float">
                            <PawPrint className="size-9" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h2 className="truncate font-display text-2xl font-bold tracking-tight leading-tight">{petOption.name}</h2>

                          <div className="mt-3 flex flex-wrap items-center gap-1 text-[10.5px] text-foreground">
                            {[getPetTypeLabel(petOption.species), petOption.breed || "No breed", titleCase(petOption.sex)].map((value, index) => (
                              <span key={`${petOption.id}-${value}-${index}`} className="rounded-full bg-card/80 px-2.5 py-1 font-medium shadow-card">
                                {value}
                              </span>
                            ))}
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="size-3" /> {getPetAgeLabel(petOption.birthDate, petOption.ageLabel)}
                            </span>
                            <span className="text-border">|</span>
                            <span className="inline-flex items-center gap-1">
                              <span
                                className="size-2.5 rounded-full ring-1 ring-border/80"
                                style={{ backgroundColor: getPetColorSwatch(petOption.color) }}
                              />
                              {petOption.color || "No color"}
                            </span>
                            <span className="text-border">|</span>
                            <span>{formatWeightKg(petOption.weightKg)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>

            {pets.length > 1 ? (
              <div className="mt-4 flex items-center justify-center gap-2">
                {pets.map((petOption, index) => (
                  <button
                    key={petOption.id}
                    type="button"
                    onClick={() => carouselApi?.scrollTo(index)}
                    aria-label={`Show ${petOption.name}`}
                    className={`h-2.5 rounded-full transition-all ${
                      index === selectedIndex ? "w-6 bg-primary" : "w-2.5 bg-border"
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </section>

          <section className="px-5 pt-6">
            <StatusCard {...statusCard} />
          </section>

          <section className="px-5 pt-6">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="font-display text-xl font-bold">For {pet.name}</h2>
                <p className="text-sm text-muted-foreground">Quick actions for the pet you’re currently viewing.</p>
              </div>
              <Link to={`/owner/pets/${pet.id}`} className="text-sm font-semibold text-primary">
                Open profile
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ActionCard
                href="/owner/share"
                icon={QrCode}
                label="Full Profile QR"
                helper="Share the richer pet profile with a clinic."
                tone="bg-primary-soft text-primary"
              />
              <ActionCard
                href="/owner/share"
                icon={ShieldCheck}
                label="Emergency QR"
                helper="Open the limited emergency card."
                tone="bg-tertiary-soft text-tertiary"
              />
              <ActionCard
                href={`/owner/pets/${pet.id}`}
                icon={PawPrint}
                label="Pet Profile"
                helper="View the full pet profile and history."
                tone="bg-primary-soft text-primary"
              />
              <ActionCard
                href="/owner/share"
                icon={Clock3}
                label="Manage Sharing"
                helper="See active links and revoke access."
                tone="bg-secondary text-secondary-foreground"
              />
            </div>
          </section>

          <section className="px-5 pt-6">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="font-display text-xl font-bold">What’s next</h2>
                <p className="text-sm text-muted-foreground">The next important things for {pet.name}.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SnapshotCard
                href={`/owner/pets/${pet.id}`}
                icon={CalendarClock}
                label="Next Appointment"
                value={nextAppointment ? formatDate(nextAppointment.scheduledFor) : "Not scheduled"}
                detail={nextAppointment ? `${nextAppointment.clinic.name} · ${formatDateTime(nextAppointment.scheduledFor)}` : "No clinic visit scheduled yet."}
              />
              <SnapshotCard
                href={`/owner/pets/${pet.id}`}
                icon={ShieldCheck}
                label="Next Care Due"
                value={nextPreventiveDue?.nextDueDate ? formatDate(nextPreventiveDue.nextDueDate) : "No due item"}
                detail={nextPreventiveDue?.nextDueDate ? `${nextPreventiveDue.careType.name} · ${nextPreventiveDue.clinicName}` : "No upcoming care reminder yet."}
              />
            </div>
          </section>

          <section className="px-5 pt-6">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="font-display text-xl font-bold">Recent activity</h2>
                <p className="text-sm text-muted-foreground">Latest recorded activity from linked clinics.</p>
              </div>
              <Link to={`/owner/pets/${pet.id}`} className="text-sm font-semibold text-primary">
                View all
              </Link>
            </div>

            <div className="space-y-3">
              {latestVisit ? (
                <HistoryCard
                  icon={Stethoscope}
                  title={latestVisit.reasonForVisit}
                  meta={`${latestVisit.clinicName} · ${formatDate(latestVisit.visitDate)}${latestVisit.weightKg ? ` · ${formatWeightKg(latestVisit.weightKg)}` : ""}`}
                  detail={latestVisit.diagnosis || latestVisit.treatmentGiven || latestVisit.findingsNotes || "No summary yet."}
                />
              ) : null}
              {latestPreventive ? (
                <HistoryCard
                  icon={ShieldCheck}
                  title={latestPreventive.careType.name}
                  meta={`${latestPreventive.clinicName} · ${formatDate(latestPreventive.administeredOn)}`}
                  detail={latestPreventive.notes || "No additional notes provided."}
                />
              ) : null}
              {!latestVisit && !latestPreventive ? (
                <div className="index-card py-8 text-center">
                  <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    <ClipboardList className="size-5" />
                  </div>
                  <div className="text-sm text-muted-foreground">No medical history yet.</div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="px-5 pb-8 pt-6">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="font-display text-xl font-bold">Connected clinics</h2>
                <p className="text-sm text-muted-foreground">Clinics currently linked to this pet record.</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/owner/share">Sharing</Link>
              </Button>
            </div>

            <div className="space-y-3">
              {pet.clinics.map((clinic) => (
                <div key={clinic.id} className="index-card">
                  <div className="font-semibold">{clinic.name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {clinic.phone ? formatPhoneForDisplay(clinic.phone) : "No clinic phone listed"}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <div className="px-5 py-10 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-3xl bg-primary-soft text-primary shadow-card">
            <PawPrint className="size-7" />
          </div>
          <div className="font-semibold">No pets linked yet.</div>
          <p className="mt-2 text-sm text-muted-foreground">Add a pet or ask your clinic to link an existing record.</p>
        </div>
      )}
    </OwnerLayout>
  );
}

type StatusCardProps = {
  kind: "appointment" | "care" | "visit" | "share";
  icon: typeof CalendarClock;
  eyebrow: string;
  title: string;
  detail: string;
  href: string;
  tone: "primary" | "warm" | "danger";
};

function StatusCard({ icon: Icon, eyebrow, title, detail, href, tone }: StatusCardProps) {
  const toneStyles =
    tone === "danger"
      ? {
          card: "border-destructive/25 bg-destructive-soft/55",
          iconBg: "bg-card text-destructive",
          eyebrow: "text-destructive",
        }
      : tone === "warm"
        ? {
            card: "border-tertiary/25 bg-tertiary-soft/55",
            iconBg: "bg-card text-tertiary",
            eyebrow: "text-tertiary",
          }
        : {
            card: "border-primary/10 bg-primary-soft/55",
            iconBg: "bg-card text-primary",
            eyebrow: "text-primary",
          };

  return (
    <Link
      to={href}
      className={`index-card flex items-center gap-4 transition-colors hover:border-primary/40 ${toneStyles.card}`}
    >
      <div className={`flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-card ${toneStyles.iconBg}`}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className={`label-eyebrow ${toneStyles.eyebrow}`}>{eyebrow}</div>
        <div className="mt-1.5 font-semibold leading-snug">{title}</div>
        <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function daysUntil(iso: string) {
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function ActionCard({
  href,
  icon: Icon,
  label,
  helper,
  tone,
}: {
  href: string;
  icon: typeof QrCode;
  label: string;
  helper: string;
  tone: string;
}) {
  return (
    <Link to={href} className="index-card flex min-h-[132px] flex-col items-start gap-3 transition-colors hover:border-primary/40">
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <div className="font-semibold">{label}</div>
        <div className="mt-1 text-sm text-muted-foreground">{helper}</div>
      </div>
    </Link>
  );
}

function SnapshotCard({
  href,
  icon: Icon,
  label,
  value,
  detail,
}: {
  href: string;
  icon: typeof CalendarClock;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Link
      to={href}
      className="block rounded-2xl border border-border/70 bg-card p-3.5 shadow-card transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-9 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Icon className="size-4" strokeWidth={2} />
        </span>
        <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
      </div>
      <div className="mt-3 label-eyebrow">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </Link>
  );
}

function HistoryCard({
  icon: Icon,
  title,
  meta,
  detail,
}: {
  icon: typeof Stethoscope;
  title: string;
  meta: string;
  detail: string;
}) {
  return (
    <div className="index-card">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{meta}</div>
          <div className="mt-2 text-sm text-muted-foreground">{detail}</div>
        </div>
      </div>
    </div>
  );
}
