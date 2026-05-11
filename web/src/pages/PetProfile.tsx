import { useMemo, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Calendar,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  HeartPulse,
  Link2,
  Mail,
  MapPin,
  MessageSquare,
  PawPrint,
  Pencil,
  Phone,
  Pill,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Syringe,
  Trash2,
  User,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { apiRequest, type PetDetail, type PreventiveRecord, type VisitRecord } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  formatCadence,
  formatWeightKg,
  formatDate,
  formatPhoneForDisplay,
  formatTime,
  getElsewhereLabel,
  getDueStatus,
  getErrorMessage,
  getPetAgeLabel,
  getPetColorSwatch,
  getPreventiveRecordSourceLabel,
  getRecordOriginLabel,
  getPetTypeLabel,
  toPhoneHref,
  titleCase,
} from "@/lib/format";

type BookletTab = "overview" | "timeline" | "vaccines" | "deworming" | "heartworm" | "visits" | "health";
type PreventiveCategory = "vaccines" | "deworming" | "heartworm" | "other";
type CareCoach = {
  action: string;
  helper: string;
  icon: LucideIcon;
  label: string;
  title: string;
  tone: string;
} & ({ href: string; kind: "link" } | { kind: "tab"; tab: BookletTab });
type TimelineItem = {
  id: string;
  date: string;
  type: "visit" | "health" | PreventiveCategory;
  title: string;
  meta: string;
  detail: string;
  href: string;
};

function getVisitSummary(visit: VisitRecord) {
  const summary = visit.diagnosis || visit.treatmentGiven || visit.findingsNotes || "No clinical notes recorded for this visit yet.";
  return visit.weightKg ? `${summary} · ${formatWeightKg(visit.weightKg)}` : summary;
}

function getPreventiveCategory(record: PreventiveRecord): PreventiveCategory {
  if (record.careType.category === "VACCINATION") {
    return "vaccines";
  }

  if (record.careType.category === "DEWORMING") {
    return "deworming";
  }

  if (record.careType.category === "HEARTWORM") {
    return "heartworm";
  }

  const name = record.careType.name.toLowerCase();
  const notes = record.notes?.toLowerCase() ?? "";
  const haystack = `${name} ${notes}`;

  if (/\b(deworm|worm|prazi|pyrantel|anthelmintic)\b/.test(haystack)) {
    return "deworming";
  }

  if (/\bheartworm\b/.test(haystack)) {
    return "heartworm";
  }

  if (/\b(vaccine|vaccination|rabies|dhpp|dhlpp|parvo|distemper|lepto|leptospirosis|bordetella|kennel cough|corona)\b/.test(haystack)) {
    return "vaccines";
  }

  return "other";
}

function getPreventiveIcon(category: PreventiveCategory) {
  if (category === "vaccines") {
    return Syringe;
  }

  if (category === "deworming") {
    return Pill;
  }

  if (category === "heartworm") {
    return HeartPulse;
  }

  return Stethoscope;
}

function getCategoryParam(category: PreventiveCategory) {
  if (category === "vaccines") {
    return "VACCINATION";
  }

  if (category === "deworming") {
    return "DEWORMING";
  }

  if (category === "heartworm") {
    return "HEARTWORM";
  }

  return "OTHER";
}

function getCareFormPath(petId: string, category: PreventiveCategory) {
  return `/pets/${petId}/preventive/new?category=${getCategoryParam(category)}`;
}

function getCategoryCopy(category: PreventiveCategory) {
  if (category === "vaccines") {
    return {
      entryLabel: "Vaccine entry",
      searchLabel: "Search vaccine records",
      searchPlaceholder: "Search vaccine, product, lot, serial...",
      productLabel: "Product",
      noResultsLabel: "vaccine records",
    };
  }

  if (category === "deworming") {
    return {
      entryLabel: "Deworming entry",
      searchLabel: "Search deworming records",
      searchPlaceholder: "Search deworming, medication, product, notes...",
      productLabel: "Medication",
      noResultsLabel: "deworming records",
    };
  }

  if (category === "heartworm") {
    return {
      entryLabel: "Heartworm entry",
      searchLabel: "Search heartworm records",
      searchPlaceholder: "Search heartworm, product, brand, notes...",
      productLabel: "Product / brand",
      noResultsLabel: "heartworm records",
    };
  }

  return {
    entryLabel: "Care entry",
    searchLabel: "Search care records",
    searchPlaceholder: "Search care records...",
    productLabel: "Product / medication",
    noResultsLabel: "care records",
  };
}

function getNextDueRecord(records: PreventiveRecord[]) {
  return [...records]
    .filter((record) => Boolean(record.careType.isRecurring && record.nextDueDate))
    .sort((left, right) => new Date(left.nextDueDate ?? 0).getTime() - new Date(right.nextDueDate ?? 0).getTime())[0];
}

export default function PetProfile() {
  const { id = "" } = useParams();
  const { token } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<BookletTab>("overview");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const petRecordRef = useRef<HTMLElement | null>(null);

  const removePet = useMutation({
    mutationFn: () => apiRequest(`/pets/${id}`, { method: "DELETE", token }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pets"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.removeQueries({ queryKey: ["pet", id] });
      navigate("/pets", { replace: true });
    },
  });

  const petQuery = useQuery({
    queryKey: ["pet", id],
    queryFn: () => apiRequest<{ pet: PetDetail }>(`/pets/${id}`, { token }),
    enabled: Boolean(token && id),
  });

  const groupedRecords = useMemo(() => {
    return petQuery.data?.pet.preventiveRecords ?? [];
  }, [petQuery.data?.pet.preventiveRecords]);

  if (petQuery.isLoading) {
    return (
      <AppLayout
        title="Pet Profile"
        titleHref={null}
        headerStart={
          <Link
            to="/pets"
            aria-label="Back to pets"
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="size-5" />
          </Link>
        }
      >
        <div className="p-8 text-center text-muted-foreground">Loading pet profile...</div>
      </AppLayout>
    );
  }

  if (petQuery.isError) {
    return (
      <AppLayout
        title="Pet Profile"
        titleHref={null}
        headerStart={
          <Link
            to="/pets"
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
      </AppLayout>
    );
  }

  if (!petQuery.data) {
    return (
      <AppLayout
        title="Pet Profile"
        titleHref={null}
        headerStart={
          <Link
            to="/pets"
            aria-label="Back to pets"
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="size-5" />
          </Link>
        }
      >
        <div className="p-8 text-center text-muted-foreground">Pet not found.</div>
      </AppLayout>
    );
  }

  const pet = petQuery.data.pet;
  const scheduledAppointments = [...pet.appointments]
    .filter((appointment) => appointment.status === "SCHEDULED")
    .sort((left, right) => new Date(left.scheduledFor).getTime() - new Date(right.scheduledFor).getTime());
  const nextAppointment = scheduledAppointments[0];
  const latestVisit = pet.visits[0];
  const nextPreventiveDue = getNextDueRecord(groupedRecords);
  const metadataChips = [getPetTypeLabel(pet.species), pet.breed || "No breed", titleCase(pet.sex)];
  const elsewhereLabel = getElsewhereLabel(pet.accessSummary);

  const categorizedRecords = groupedRecords.reduce<Record<PreventiveCategory, PreventiveRecord[]>>(
    (acc, record) => {
      acc[getPreventiveCategory(record)].push(record);
      return acc;
    },
    { vaccines: [], deworming: [], heartworm: [], other: [] },
  );
  const petAllergies = pet.allergies ?? [];
  const petMedications = pet.medications ?? [];
  const petDietNotes = pet.dietNotes ?? [];
  const activeAllergies = petAllergies.filter((allergy) => allergy.isActive);
  const activeMedications = petMedications.filter((medication) => medication.isActive);
  const activeDietNotes = petDietNotes.filter((dietNote) => dietNote.isActive);
  const activeHealthNoteCount = activeAllergies.length + activeMedications.length + activeDietNotes.length;
  const timelineItems = [
    ...pet.visits.map((visit) => ({
      id: `visit-${visit.id}`,
      date: visit.visitDate,
      type: "visit" as const,
      title: visit.reasonForVisit,
      meta: `${visit.attendedBy.fullName} · ${visit.sourceLabel}`,
      detail: getVisitSummary(visit),
      href: `/pets/${pet.id}/visits/${visit.id}`,
    })),
    ...groupedRecords.map((record) => {
      const category = getPreventiveCategory(record);
      const categoryLabel =
        category === "vaccines"
          ? "Vaccination recorded"
          : category === "deworming"
            ? "Deworming recorded"
            : category === "heartworm"
              ? "Heartworm prevention recorded"
              : "Care item recorded";

      return {
        id: `care-${record.id}`,
        date: record.administeredOn,
        type: category,
        title: categoryLabel,
        meta: `${record.careType.name} · ${record.administeredBy.fullName}`,
        detail: record.notes || (record.nextDueDate ? `Next due ${formatDate(record.nextDueDate)}` : "No additional notes."),
        href: record.recordedHere ? `/pets/${pet.id}/preventive/${record.id}/edit` : `/pets/${pet.id}/preventive`,
      };
    }),
    ...petAllergies.map((allergy) => ({
      id: `allergy-${allergy.id}`,
      date: allergy.updatedAt,
      type: "health" as const,
      title: allergy.isActive ? "Allergy noted" : "Allergy marked inactive",
      meta: `${allergy.allergen}${allergy.clinicName ? ` · ${allergy.clinicName}` : ""}`,
      detail: [allergy.severity, allergy.reaction, allergy.notes].filter(Boolean).join(" · ") || "No additional allergy details.",
      href: `/pets/${pet.id}`,
    })),
    ...petMedications.map((medication) => ({
      id: `medication-${medication.id}`,
      date: medication.updatedAt,
      type: "health" as const,
      title: medication.isActive ? "Medication noted" : "Medication marked inactive",
      meta: `${medication.name}${medication.clinicName ? ` · ${medication.clinicName}` : ""}`,
      detail: [medication.dose, medication.frequency, medication.route, medication.notes].filter(Boolean).join(" · ") || "No medication details.",
      href: `/pets/${pet.id}`,
    })),
    ...petDietNotes.map((dietNote) => ({
      id: `diet-${dietNote.id}`,
      date: dietNote.updatedAt,
      type: "health" as const,
      title: dietNote.isActive ? "Diet note added" : "Diet note marked inactive",
      meta: `${dietNote.dietName}${dietNote.clinicName ? ` · ${dietNote.clinicName}` : ""}`,
      detail: dietNote.remarks || "No additional diet remarks.",
      href: `/pets/${pet.id}`,
    })),
  ].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  const tabs: Array<{ key: BookletTab; label: string; count?: number }> = [
    { key: "overview", label: "Overview" },
    { key: "timeline", label: "Timeline", count: timelineItems.length },
    { key: "vaccines", label: "Vaccines", count: categorizedRecords.vaccines.length },
    { key: "deworming", label: "Deworming", count: categorizedRecords.deworming.length },
    { key: "heartworm", label: "Heartworm", count: categorizedRecords.heartworm.length },
    { key: "visits", label: "Visits", count: pet.visits.length },
    { key: "health", label: "Health Notes", count: activeHealthNoteCount },
  ];
  const profileActions = [
    {
      label: "New Visit",
      helper: "Exam, findings, diagnosis, and treatment.",
      href: `/pets/${pet.id}/visits/new`,
      state: { from: `/pets/${pet.id}` },
      icon: Stethoscope,
      tone: "bg-success-soft text-success",
    },
    {
      label: "Appointment",
      helper: "Book the next clinic schedule.",
      href: `/appointments/new?petId=${pet.id}`,
      state: { from: `/pets/${pet.id}` },
      icon: CalendarClock,
      tone: "bg-primary-soft text-primary",
    },
    {
      label: "Care Item",
      helper: "Vaccine, deworming, heartworm, or other care.",
      href: getCareFormPath(pet.id, "other"),
      state: { from: `/pets/${pet.id}` },
      icon: ShieldCheck,
      tone: "bg-tertiary-soft text-tertiary",
    },
  ];
  const careCoach: CareCoach = (() => {
    if (activeAllergies.length || activeMedications.length) {
      return {
        label: "Check first",
        title: "Review active health notes",
        helper: `${pet.name} has ${activeHealthNoteCount} active note${activeHealthNoteCount === 1 ? "" : "s"} to keep visible before care starts.`,
        action: "Open",
        icon: AlertTriangle,
        kind: "tab",
        tab: "health" as BookletTab,
        tone: "border-tertiary/20 bg-tertiary-soft/55 text-tertiary",
      };
    }

    if (nextPreventiveDue?.nextDueDate) {
      const status = getDueStatus(nextPreventiveDue.nextDueDate);
      const category = getPreventiveCategory(nextPreventiveDue);

      return {
        label: status.tone === "danger" ? "Needs follow-up" : "Care rhythm",
        title: `${nextPreventiveDue.careType.name} is ${status.label.toLowerCase()}`,
        helper: `Next due ${formatDate(nextPreventiveDue.nextDueDate)}. Open the booklet section before the owner leaves.`,
        action: "Review",
        icon: ShieldCheck,
        kind: "tab",
        tab: category === "other" ? "overview" as BookletTab : category as BookletTab,
        tone:
          status.tone === "danger"
            ? "border-destructive/20 bg-destructive-soft/55 text-destructive"
            : "border-primary/15 bg-primary-soft/65 text-primary",
      };
    }

    if (nextAppointment) {
      return {
        label: "Coming up",
        title: "Next visit is already booked",
        helper: `${formatDate(nextAppointment.scheduledFor)} at ${formatTime(nextAppointment.scheduledFor)} for ${nextAppointment.reason}.`,
        action: "Open",
        icon: CalendarClock,
        kind: "link",
        href: `/appointments/${nextAppointment.id}`,
        tone: "border-success/20 bg-success-soft/65 text-success",
      };
    }

    return {
      label: "Good next step",
      title: "Start with a fresh visit note",
      helper: `No appointment is scheduled yet. Add a visit when ${pet.name} is seen, or book the next slot from here.`,
      action: "Record",
      icon: Stethoscope,
      kind: "link",
      href: `/pets/${pet.id}/visits/new`,
      tone: "border-primary/15 bg-primary-soft/65 text-primary",
    };
  })();
  const openBookletTab = (nextTab: BookletTab) => {
    setTab(nextTab);
    window.requestAnimationFrame(() => {
      petRecordRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <AppLayout
      title="Pet Profile"
      titleHref={null}
      headerStart={
        <Link
          to="/pets"
          aria-label="Back to pets"
          className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
      }
      headerEnd={
        <Link
          to={`/pets/${pet.id}/edit`}
          state={{ from: `/pets/${pet.id}` }}
          aria-label="Edit pet"
          className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Pencil className="size-4" />
        </Link>
      }
    >
      <div className="space-y-4 px-5 pb-8 pt-4">
        <section className="relative overflow-hidden rounded-[1.5rem] border border-primary/10 bg-card p-3 shadow-card">
          <div className="relative flex items-center gap-4">
            {pet.avatarUrl ? (
              <img src={pet.avatarUrl} alt={pet.name} className="size-16 rounded-[1.15rem] border-2 border-background/80 object-cover shadow-card" />
            ) : (
              <div className="flex size-16 shrink-0 items-center justify-center rounded-[1.15rem] bg-primary-soft text-primary shadow-card">
                <PawPrint className="size-8" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="line-clamp-2 font-display text-xl font-bold tracking-tight leading-tight">{pet.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-1 text-[10.5px] text-foreground">
                {metadataChips.map((value, index) => (
                  <span key={`${pet.id}-${value}-${index}`} className="rounded-full bg-card/80 px-2.5 py-1 font-medium shadow-card">
                    {value}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
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

        <section className="index-card p-3">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <User className="size-4" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{pet.owner.fullName}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="size-3.5 shrink-0 text-primary" />
                    <span className="truncate">{formatPhoneForDisplay(pet.owner.mobile)}</span>
                  </div>
                </div>
                <div className="grid shrink-0 grid-cols-2 gap-2">
                  <a
                    href={`sms:${toPhoneHref(pet.owner.mobile)}`}
                    aria-label={`Text ${pet.owner.fullName}`}
                    className="inline-flex min-h-10 min-w-12 flex-col items-center justify-center rounded-2xl border border-border/70 bg-card px-2 text-[10px] font-semibold text-primary shadow-card hover:border-primary/40"
                  >
                    <MessageSquare className="size-4" />
                    Text
                  </a>
                  <a
                    href={`tel:${toPhoneHref(pet.owner.mobile)}`}
                    aria-label={`Call ${pet.owner.fullName}`}
                    className="inline-flex min-h-10 min-w-12 flex-col items-center justify-center rounded-2xl border border-border/70 bg-card px-2 text-[10px] font-semibold text-primary shadow-card hover:border-primary/40"
                  >
                    <Phone className="size-4" />
                    Call
                  </a>
                </div>
              </div>

              {pet.owner.email || pet.owner.address ? (
                <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                  {pet.owner.email ? (
                    <a
                      href={`mailto:${pet.owner.email}`}
                      className="flex items-center gap-1.5 transition-colors hover:text-primary"
                    >
                      <Mail className="size-3.5 shrink-0 text-primary" />
                      <span className="truncate">{pet.owner.email}</span>
                    </a>
                  ) : null}
                  {pet.owner.address ? (
                    <div className="flex items-start gap-1.5">
                      <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      <span className="leading-5">{pet.owner.address}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section>
          {careCoach.kind === "link" ? (
            <Link
              to={careCoach.href}
              state={{ from: `/pets/${pet.id}` }}
              className={`relative block overflow-hidden rounded-[1.5rem] border p-3 text-left shadow-card transition-colors hover:border-primary/30 ${careCoach.tone}`}
            >
              <CareCoachContent coach={careCoach} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openBookletTab(careCoach.tab)}
              className={`relative block w-full overflow-hidden rounded-[1.5rem] border p-3 text-left shadow-card transition-colors hover:border-primary/30 ${careCoach.tone}`}
            >
              <CareCoachContent coach={careCoach} />
            </button>
          )}
        </section>

        <section className="rounded-2xl border border-border/70 bg-card p-3 shadow-card">
          <div className="label-eyebrow px-1 pb-2">Quick record</div>
          <div className="grid grid-cols-3 gap-2">
            {profileActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.label}
                  to={action.href}
                  state={action.state}
                  className="flex min-h-[74px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-border/70 bg-card px-2 py-2.5 text-center shadow-card transition-colors hover:border-primary/40"
                >
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-2xl ${action.tone}`}>
                    <Icon className="size-4" />
                  </span>
                  <span className="text-sm font-bold leading-tight">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </section>

        <section ref={petRecordRef} className="overflow-hidden rounded-[1.75rem] border border-primary/10 bg-card shadow-card">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold">Pet record</h2>
            </div>
            {elsewhereLabel ? (
              <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
                <Link2 className="size-3.5" />
                <span>{elsewhereLabel}</span>
              </div>
            ) : null}
          </div>

          <div className="relative border-y border-border/70 bg-card">
            <div className="flex overflow-x-auto no-scrollbar px-1 pr-8" role="tablist" aria-label="Pet record sections">
              {tabs.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.key}
                  onClick={() => setTab(item.key)}
                  className={cn(
                    "relative flex min-h-12 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap px-3 text-sm font-semibold transition-colors",
                    tab === item.key
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{item.label}</span>
                  {item.count !== undefined ? <span className="text-xs font-medium text-current/70">{item.count}</span> : null}
                  {tab === item.key ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary" /> : null}
                </button>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-card to-transparent" />
          </div>

          <div className="px-5 py-5">
            {tab === "overview" ? (
              <BookletOverviewPanel
                pet={pet}
                nextAppointment={nextAppointment}
                latestVisit={latestVisit}
                nextPreventiveDue={nextPreventiveDue}
                categorizedRecords={categorizedRecords}
                onOpenTab={openBookletTab}
              />
            ) : null}
            {tab === "timeline" ? <TimelinePanel items={timelineItems} /> : null}
            {tab === "vaccines" ? (
              <PreventivePanel
                petId={pet.id}
                records={categorizedRecords.vaccines}
                category="vaccines"
                title="Vaccination Record"
                description="Vaccine history with product, lot, serial, and expiry details when available."
                emptyTitle="No vaccines recorded yet."
                emptyActionLabel="Record Vaccine"
              />
            ) : null}
            {tab === "deworming" ? (
              <PreventivePanel
                petId={pet.id}
                records={categorizedRecords.deworming}
                category="deworming"
                title="Deworming History"
                description="Deworming entries with medication/product, date given, and next deworming due."
                emptyTitle="No deworming history yet."
                emptyActionLabel="Record Deworming"
              />
            ) : null}
            {tab === "heartworm" ? (
              <PreventivePanel
                petId={pet.id}
                records={categorizedRecords.heartworm}
                category="heartworm"
                title="Heartworm Therapy"
                description="Heartworm prevention and therapy records with product/brand and next due date."
                emptyTitle="No heartworm records yet."
                emptyActionLabel="Record Heartworm Care"
              />
            ) : null}
            {tab === "visits" ? <VisitsPanel petId={pet.id} visits={pet.visits} /> : null}
            {tab === "health" ? (
              <HealthNotesPanel
                pet={pet}
                token={token}
                onChanged={async () => {
                  await queryClient.invalidateQueries({ queryKey: ["pet", pet.id] });
                }}
              />
            ) : null}
          </div>
        </section>

        <section className="index-card border-destructive/20">
          {removePet.isError ? (
            <p className="mb-3 text-xs font-medium text-destructive">{getErrorMessage(removePet.error)}</p>
          ) : null}
          {confirmRemove ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Remove {pet.name} from this clinic permanently?</p>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmRemove(false)}
                  disabled={removePet.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => removePet.mutate()}
                  disabled={removePet.isPending}
                >
                  {removePet.isPending ? "Removing..." : "Yes, remove"}
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="flex items-center gap-2 text-sm font-semibold text-destructive/70 hover:text-destructive transition-colors"
            >
              <Trash2 className="size-4" />
              Remove from this clinic
            </button>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

function BookletOverviewPanel({
  pet,
  nextAppointment,
  latestVisit,
  nextPreventiveDue,
  categorizedRecords,
  onOpenTab,
}: {
  pet: PetDetail;
  nextAppointment?: PetDetail["appointments"][number];
  latestVisit?: VisitRecord;
  nextPreventiveDue?: PreventiveRecord;
  categorizedRecords: Record<PreventiveCategory, PreventiveRecord[]>;
  onOpenTab: (tab: BookletTab) => void;
}) {
  const activeHealthNoteCount =
    (pet.allergies ?? []).filter((item) => item.isActive).length +
    (pet.medications ?? []).filter((item) => item.isActive).length +
    (pet.dietNotes ?? []).filter((item) => item.isActive).length;
  const categoryItems: Array<{ label: string; value: number; icon: LucideIcon; tab: BookletTab }> = [
    {
      label: "Vaccines",
      value: categorizedRecords.vaccines.length,
      icon: Syringe,
      tab: "vaccines",
    },
    {
      label: "Deworming",
      value: categorizedRecords.deworming.length,
      icon: Pill,
      tab: "deworming",
    },
    {
      label: "Heartworm",
      value: categorizedRecords.heartworm.length,
      icon: HeartPulse,
      tab: "heartworm",
    },
    {
      label: "Visits",
      value: pet.visits.length,
      icon: Stethoscope,
      tab: "visits",
    },
    {
      label: "Notes",
      value: activeHealthNoteCount,
      icon: AlertTriangle,
      tab: "health",
    },
  ];

  return (
    <div className="space-y-3">
      <BookletOverviewRow
        icon={Stethoscope}
        title="Last visit"
        value={latestVisit ? formatDate(latestVisit.visitDate) : "No visits yet"}
        detail={latestVisit ? `${latestVisit.reasonForVisit}${latestVisit.weightKg ? ` · ${formatWeightKg(latestVisit.weightKg)}` : ""}` : "Record the first clinic visit."}
        href={latestVisit ? `/pets/${pet.id}/visits/${latestVisit.id}` : `/pets/${pet.id}/visits/new`}
        action={latestVisit ? "View" : "Record"}
      />
      <BookletOverviewRow
        icon={CalendarClock}
        title="Next appointment"
        value={nextAppointment ? formatDate(nextAppointment.scheduledFor) : "Not scheduled"}
        detail={nextAppointment ? `${formatTime(nextAppointment.scheduledFor)} · ${nextAppointment.reason}` : "Book the next clinic visit when needed."}
        href={nextAppointment ? `/appointments/${nextAppointment.id}` : `/appointments/new?petId=${pet.id}`}
        action={nextAppointment ? "Open" : "Book"}
      />
      <BookletOverviewRow
        icon={nextPreventiveDue?.nextDueDate ? AlertTriangle : ShieldCheck}
        title="Next care due"
        value={nextPreventiveDue?.nextDueDate ? formatDate(nextPreventiveDue.nextDueDate) : "Not scheduled"}
        detail={
          nextPreventiveDue?.nextDueDate
            ? `${nextPreventiveDue.careType.name} · ${getDueStatus(nextPreventiveDue.nextDueDate).label}`
            : "Recurring care items will surface here."
        }
        href={`/pets/${pet.id}/preventive`}
        action="Details"
        warm={Boolean(nextPreventiveDue?.nextDueDate)}
      />
      <button
        type="button"
        onClick={() => onOpenTab("health")}
        className="flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 text-left shadow-card transition-colors hover:border-primary/40"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <HeartPulse className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Health notes</span>
          <span className="mt-0.5 block text-sm text-muted-foreground">
            {activeHealthNoteCount ? `${activeHealthNoteCount} active allergies, meds, or diet notes` : "No active health notes"}
          </span>
        </span>
        <span className="shrink-0 rounded-full border border-primary/25 bg-card px-3 py-1.5 text-xs font-bold text-primary">
          {activeHealthNoteCount ? "Manage" : "Add"}
        </span>
      </button>

      <div className="grid grid-cols-5 gap-2">
        {categoryItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onOpenTab(item.tab)}
              className="min-w-0 rounded-2xl border border-border/70 bg-card px-2 py-3 text-center shadow-card transition-colors hover:border-primary/40"
            >
              <span className="mx-auto flex size-9 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <Icon className="size-4" />
              </span>
              <span className="mt-2 block font-display text-xl font-bold leading-none">{item.value}</span>
              <span className="mt-1 block truncate text-[10px] font-bold uppercase tracking-[0.04em] text-muted-foreground">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BookletOverviewRow({
  icon: Icon,
  title,
  value,
  detail,
  href,
  action,
  warm,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  detail: string;
  href: string;
  action: string;
  warm?: boolean;
}) {
  return (
    <Link
      to={href}
      className={`flex items-center gap-3 rounded-2xl border p-3 shadow-card transition-colors hover:border-primary/40 ${
        warm ? "border-tertiary/25 bg-tertiary-soft/35" : "border-border/70 bg-card"
      }`}
    >
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${warm ? "bg-card text-tertiary" : "bg-primary-soft text-primary"}`}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block font-display text-base font-bold">{value}</span>
        <span className="mt-0.5 block truncate text-sm text-muted-foreground">{detail}</span>
      </span>
      <span className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${warm ? "border-tertiary/25 bg-card text-tertiary" : "border-primary/25 bg-card text-primary"}`}>
        {action}
      </span>
    </Link>
  );
}

function TimelinePanel({ items }: { items: TimelineItem[] }) {
  if (!items.length) {
    return (
      <EmptyBookletState
        icon={Activity}
        title="No timeline entries yet."
        description="Visits, vaccines, deworming, heartworm care, and health-note changes will appear here chronologically."
      />
    );
  }

  return (
    <div>
      <div className="mb-3">
        <h3 className="font-display text-base font-bold">Full Timeline</h3>
        <p className="text-sm text-muted-foreground">Everything important, sorted from newest to oldest.</p>
      </div>
      <div className="space-y-3">
        {items.map((item) => {
          const Icon = item.type === "visit" ? Stethoscope : item.type === "health" ? AlertTriangle : getPreventiveIcon(item.type);

          return (
            <Link
              key={item.id}
              to={item.href}
              className="block rounded-2xl border border-border/70 bg-card p-4 shadow-card transition-colors hover:border-primary/40"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{item.title}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(item.date)} · {item.meta}
                      </div>
                    </div>
                    <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">{item.detail}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function HealthNotesPanel({
  pet,
  token,
  onChanged,
}: {
  pet: PetDetail;
  token: string | null;
  onChanged: () => Promise<void>;
}) {
  const [allergy, setAllergy] = useState({ allergen: "", severity: "", reaction: "", notes: "" });
  const [medication, setMedication] = useState({ name: "", dose: "", frequency: "", route: "", notes: "" });
  const [dietNote, setDietNote] = useState({ dietName: "", remarks: "" });
  const [entryType, setEntryType] = useState<"allergy" | "medication" | "diet">("allergy");
  const [editing, setEditing] = useState<null | { kind: "allergy" | "medication" | "diet"; id: string }>(null);

  const activeAllergies = (pet.allergies ?? []).filter((item) => item.isActive);
  const activeMedications = (pet.medications ?? []).filter((item) => item.isActive);
  const activeDietNotes = (pet.dietNotes ?? []).filter((item) => item.isActive);
  const hasActiveNotes = activeAllergies.length || activeMedications.length || activeDietNotes.length;

  const addHealthNote = useMutation({
    mutationFn: ({ path, body, method = "POST" }: { path: string; body: Record<string, string>; method?: "POST" | "PUT" }) =>
      apiRequest(path, {
        method,
        token,
        body: JSON.stringify(body),
      }),
    onSuccess: async (_, variables) => {
      if (variables.path.includes("allerg")) {
        setAllergy({ allergen: "", severity: "", reaction: "", notes: "" });
      } else if (variables.path.includes("medication")) {
        setMedication({ name: "", dose: "", frequency: "", route: "", notes: "" });
      } else {
        setDietNote({ dietName: "", remarks: "" });
      }
      setEditing(null);
      await onChanged();
    },
  });

  const markInactive = useMutation({
    mutationFn: ({ kind, id }: { kind: "allergy" | "medication" | "diet"; id: string }) => {
      const path =
        kind === "allergy"
          ? `/pet-allergies/${id}`
          : kind === "medication"
            ? `/pet-medications/${id}`
            : `/pet-diet-notes/${id}`;

      return apiRequest(path, { method: "DELETE", token });
    },
    onSuccess: onChanged,
  });
  const entryOptions: Array<{ key: "allergy" | "medication" | "diet"; label: string; icon: LucideIcon }> = [
    { key: "allergy", label: "Allergy", icon: AlertTriangle },
    { key: "medication", label: "Medication", icon: Pill },
    { key: "diet", label: "Diet", icon: ClipboardList },
  ];
  const clearCurrentForm = (kind: "allergy" | "medication" | "diet") => {
    if (kind === "allergy") {
      setAllergy({ allergen: "", severity: "", reaction: "", notes: "" });
    } else if (kind === "medication") {
      setMedication({ name: "", dose: "", frequency: "", route: "", notes: "" });
    } else {
      setDietNote({ dietName: "", remarks: "" });
    }
  };
  const cancelEdit = () => {
    if (editing) {
      clearCurrentForm(editing.kind);
    }
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      {addHealthNote.isError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
          {getErrorMessage(addHealthNote.error)}
        </div>
      ) : null}
      {markInactive.isError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
          {getErrorMessage(markInactive.error)}
        </div>
      ) : null}

      <div>
        <h3 className="font-display text-base font-bold">Health Notes</h3>
        <p className="text-sm text-muted-foreground">
          Current allergies, ongoing medications, and diet remarks that should stay visible between visits.
        </p>
      </div>

      {hasActiveNotes ? (
        <div className="space-y-3">
          {activeAllergies.map((item) => (
            <HealthNoteCard
              key={item.id}
              icon={AlertTriangle}
              title={item.allergen}
              eyebrow="Allergy"
              detail={[item.severity, item.reaction, item.notes].filter(Boolean).join(" · ") || "No additional allergy details."}
              meta={item.clinicName ?? "Clinic note"}
              canArchive={item.recordedHere}
              onEdit={
                item.recordedHere
                  ? () => {
                      setAllergy({
                        allergen: item.allergen,
                        severity: item.severity ?? "",
                        reaction: item.reaction ?? "",
                        notes: item.notes ?? "",
                      });
                      setEntryType("allergy");
                      setEditing({ kind: "allergy", id: item.id });
                    }
                  : undefined
              }
              archiveLabel="Mark inactive"
              onArchive={() => markInactive.mutate({ kind: "allergy", id: item.id })}
              disabled={markInactive.isPending}
            />
          ))}
          {activeMedications.map((item) => (
            <HealthNoteCard
              key={item.id}
              icon={Pill}
              title={item.name}
              eyebrow="Medication"
              detail={[item.dose, item.frequency, item.route, item.notes].filter(Boolean).join(" · ") || "No medication details."}
              meta={item.clinicName ?? "Clinic note"}
              canArchive={item.recordedHere}
              onEdit={
                item.recordedHere
                  ? () => {
                      setMedication({
                        name: item.name,
                        dose: item.dose ?? "",
                        frequency: item.frequency ?? "",
                        route: item.route ?? "",
                        notes: item.notes ?? "",
                      });
                      setEntryType("medication");
                      setEditing({ kind: "medication", id: item.id });
                    }
                  : undefined
              }
              archiveLabel="Mark inactive"
              onArchive={() => markInactive.mutate({ kind: "medication", id: item.id })}
              disabled={markInactive.isPending}
            />
          ))}
          {activeDietNotes.map((item) => (
            <HealthNoteCard
              key={item.id}
              icon={ClipboardList}
              title={item.dietName}
              eyebrow="Diet"
              detail={item.remarks || "No additional diet remarks."}
              meta={item.clinicName ?? "Clinic note"}
              canArchive={item.recordedHere}
              onEdit={
                item.recordedHere
                  ? () => {
                      setDietNote({
                        dietName: item.dietName,
                        remarks: item.remarks ?? "",
                      });
                      setEntryType("diet");
                      setEditing({ kind: "diet", id: item.id });
                    }
                  : undefined
              }
              archiveLabel="Mark inactive"
              onArchive={() => markInactive.mutate({ kind: "diet", id: item.id })}
              disabled={markInactive.isPending}
            />
          ))}
        </div>
      ) : (
        <EmptyBookletState
          icon={AlertTriangle}
          title="No active health notes yet."
          description={`Add allergies, ongoing medications, or diet remarks for ${pet.name} when they need to stay visible between visits.`}
        />
      )}

      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-card">
        <div className="mb-4">
          <div className="label-eyebrow">Add or edit</div>
          <div className="mt-2 grid grid-cols-3 gap-2 rounded-2xl bg-secondary/60 p-1">
            {entryOptions.map((item) => {
              const Icon = item.icon;
              const selected = entryType === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if (editing && editing.kind !== item.key) {
                      clearCurrentForm(editing.kind);
                      setEditing(null);
                    }
                    setEntryType(item.key);
                  }}
                  className={cn(
                    "flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-semibold transition-colors",
                    selected ? "bg-card text-primary shadow-card" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {entryType === "allergy" ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              addHealthNote.mutate({
                path: editing?.kind === "allergy" ? `/pet-allergies/${editing.id}` : `/pets/${pet.id}/allergies`,
                method: editing?.kind === "allergy" ? "PUT" : "POST",
                body: allergy,
              });
            }}
          >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-4 text-tertiary" /> {editing?.kind === "allergy" ? "Edit Allergy" : "Add Allergy"}
            </div>
            {editing?.kind === "allergy" ? (
              <button type="button" onClick={cancelEdit} className="text-xs font-semibold text-muted-foreground hover:text-primary">
                Cancel
              </button>
            ) : null}
          </div>
          <div className="mt-3 grid gap-2">
            <input
              required
              className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              placeholder="Allergen"
              value={allergy.allergen}
              onChange={(event) => setAllergy((current) => ({ ...current, allergen: event.target.value }))}
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                placeholder="Severity"
                value={allergy.severity}
                onChange={(event) => setAllergy((current) => ({ ...current, severity: event.target.value }))}
              />
              <input
                className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                placeholder="Reaction"
                value={allergy.reaction}
                onChange={(event) => setAllergy((current) => ({ ...current, reaction: event.target.value }))}
              />
            </div>
            <textarea
              className="min-h-20 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="Notes"
              value={allergy.notes}
              onChange={(event) => setAllergy((current) => ({ ...current, notes: event.target.value }))}
            />
          </div>
          <Button type="submit" size="sm" className="mt-3 rounded-xl" disabled={addHealthNote.isPending}>
            {addHealthNote.isPending ? "Saving..." : editing?.kind === "allergy" ? "Save Allergy" : "Add Allergy"}
          </Button>
          </form>
        ) : null}

        {entryType === "medication" ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              addHealthNote.mutate({
                path: editing?.kind === "medication" ? `/pet-medications/${editing.id}` : `/pets/${pet.id}/medications`,
                method: editing?.kind === "medication" ? "PUT" : "POST",
                body: medication,
              });
            }}
          >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-semibold">
              <Pill className="size-4 text-primary" /> {editing?.kind === "medication" ? "Edit Medication" : "Add Medication"}
            </div>
            {editing?.kind === "medication" ? (
              <button type="button" onClick={cancelEdit} className="text-xs font-semibold text-muted-foreground hover:text-primary">
                Cancel
              </button>
            ) : null}
          </div>
          <div className="mt-3 grid gap-2">
            <input
              required
              className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              placeholder="Medication name"
              value={medication.name}
              onChange={(event) => setMedication((current) => ({ ...current, name: event.target.value }))}
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                placeholder="Dose"
                value={medication.dose}
                onChange={(event) => setMedication((current) => ({ ...current, dose: event.target.value }))}
              />
              <input
                className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                placeholder="Frequency"
                value={medication.frequency}
                onChange={(event) => setMedication((current) => ({ ...current, frequency: event.target.value }))}
              />
              <input
                className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                placeholder="Route"
                value={medication.route}
                onChange={(event) => setMedication((current) => ({ ...current, route: event.target.value }))}
              />
            </div>
            <textarea
              className="min-h-20 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="Notes"
              value={medication.notes}
              onChange={(event) => setMedication((current) => ({ ...current, notes: event.target.value }))}
            />
          </div>
          <Button type="submit" size="sm" className="mt-3 rounded-xl" disabled={addHealthNote.isPending}>
            {addHealthNote.isPending ? "Saving..." : editing?.kind === "medication" ? "Save Medication" : "Add Medication"}
          </Button>
          </form>
        ) : null}

        {entryType === "diet" ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              addHealthNote.mutate({
                path: editing?.kind === "diet" ? `/pet-diet-notes/${editing.id}` : `/pets/${pet.id}/diet-notes`,
                method: editing?.kind === "diet" ? "PUT" : "POST",
                body: dietNote,
              });
            }}
          >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-semibold">
              <ClipboardList className="size-4 text-primary" /> {editing?.kind === "diet" ? "Edit Diet Note" : "Add Diet Note"}
            </div>
            {editing?.kind === "diet" ? (
              <button type="button" onClick={cancelEdit} className="text-xs font-semibold text-muted-foreground hover:text-primary">
                Cancel
              </button>
            ) : null}
          </div>
          <div className="mt-3 grid gap-2">
            <input
              required
              className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              placeholder="Diet or feeding instruction"
              value={dietNote.dietName}
              onChange={(event) => setDietNote((current) => ({ ...current, dietName: event.target.value }))}
            />
            <textarea
              className="min-h-20 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="Remarks"
              value={dietNote.remarks}
              onChange={(event) => setDietNote((current) => ({ ...current, remarks: event.target.value }))}
            />
          </div>
          <Button type="submit" size="sm" className="mt-3 rounded-xl" disabled={addHealthNote.isPending}>
            {addHealthNote.isPending ? "Saving..." : editing?.kind === "diet" ? "Save Diet Note" : "Add Diet Note"}
          </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function HealthNoteCard({
  icon: Icon,
  eyebrow,
  title,
  detail,
  meta,
  canArchive,
  onEdit,
  archiveLabel,
  onArchive,
  disabled,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  detail: string;
  meta: string;
  canArchive: boolean;
  onEdit?: () => void;
  archiveLabel: string;
  onArchive: () => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="label-eyebrow">{eyebrow}</div>
              <div className="mt-1 text-sm font-semibold">{title}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{meta}</div>
            </div>
            {canArchive ? (
              <div className="flex shrink-0 items-center gap-3">
                {onEdit ? (
                  <button
                    type="button"
                    onClick={onEdit}
                    disabled={disabled}
                    className="text-xs font-semibold text-primary hover:text-primary/80 disabled:opacity-50"
                  >
                    Edit
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onArchive}
                  disabled={disabled}
                  className="text-xs font-semibold text-muted-foreground hover:text-primary disabled:opacity-50"
                >
                  {archiveLabel}
                </button>
              </div>
            ) : null}
          </div>
          <div className="mt-2 text-sm text-muted-foreground">{detail}</div>
        </div>
      </div>
    </div>
  );
}

function EmptyBookletState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-primary/20 bg-primary-soft/25 p-6 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-card text-primary shadow-card">
        <Icon className="size-5" />
      </span>
      <div className="mt-3 font-semibold">{title}</div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function VisitsPanel({
  petId,
  visits,
}: {
  petId: string;
  visits: PetDetail["visits"];
}) {
  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-bold">Visit Timeline</h3>
          <p className="text-sm text-muted-foreground">
            {visits.length ? `${visits.length} recorded visit${visits.length === 1 ? "" : "s"}` : "No visit history yet."}
          </p>
        </div>
      </div>
      {visits.length ? (
        <div className="space-y-3">
          {visits.map((visit) => (
            <Link
              key={visit.id}
              to={`/pets/${petId}/visits/${visit.id}`}
              state={{ from: `/pets/${petId}` }}
              className="block rounded-2xl border border-border/70 bg-card p-4 shadow-card transition-colors hover:border-primary/40"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <CalendarClock className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{visit.reasonForVisit}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(visit.visitDate)} · {visit.attendedBy.fullName}
                        {visit.weightKg ? ` · ${formatWeightKg(visit.weightKg)}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!visit.recordedHere ? <StatusBadge tone="neutral">{visit.sourceLabel}</StatusBadge> : null}
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">{getVisitSummary(visit)}</div>
                  {visit.followUpNotes ? (
                    <div className="mt-2 rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                      Follow-up: {visit.followUpNotes}
                    </div>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No visits recorded yet.
        </div>
      )}
    </div>
  );
}

function PreventivePanel({
  petId,
  records,
  category,
  title,
  description,
  emptyTitle,
  emptyActionLabel,
}: {
  petId: string;
  records: PreventiveRecord[];
  category: PreventiveCategory;
  title: string;
  description: string;
  emptyTitle: string;
  emptyActionLabel: string;
}) {
  const Icon = getPreventiveIcon(category);
  const copy = getCategoryCopy(category);
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredRecords = normalizedSearch
    ? records.filter((record) =>
        [
          record.careType.name,
          record.productName,
          record.manufacturer,
          record.lotNumber,
          record.serialNumber,
          record.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch),
      )
    : records;

  if (!records.length) {
    return (
      <EmptyBookletState
        icon={Icon}
        title={emptyTitle}
        description={description}
        action={
          <Button asChild variant="outline" size="sm">
            <Link to={getCareFormPath(petId, category)} state={{ from: `/pets/${petId}` }}>
              {emptyActionLabel}
            </Link>
          </Button>
        }
      />
    );
  }

  if (category !== "other") {
    const nextDue = getNextDueRecord(records);

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to={getCareFormPath(petId, category)} state={{ from: `/pets/${petId}` }}>
              {emptyActionLabel}
            </Link>
          </Button>
        </div>

        {records.length >= 5 ? (
          <label className="relative block">
            <span className="sr-only">{copy.searchLabel}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder={copy.searchPlaceholder}
            />
          </label>
        ) : null}

        {nextDue?.nextDueDate && records.length > 1 ? (
          <div className="rounded-2xl border border-primary/10 bg-primary-soft/45 px-4 py-3 text-sm">
            <div className="font-semibold text-foreground">Next due: {formatDate(nextDue.nextDueDate)}</div>
            <div className="mt-1 text-muted-foreground">
              {nextDue.careType.name} · {getDueStatus(nextDue.nextDueDate).label}
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-border/70 bg-card shadow-card">
          <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-border/70 bg-secondary/35 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>{copy.entryLabel}</span>
            <span>Next due</span>
          </div>
          {filteredRecords.length ? (
            <div className="divide-y divide-border/70">
              {filteredRecords.map((record) => {
                const isRecurring = Boolean(record.careType.isRecurring && record.nextDueDate);
                const status = isRecurring ? getDueStatus(record.nextDueDate) : { label: "One time", tone: "neutral" as const };

                return (
                  <div key={record.id} className="px-4 py-4">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold">{record.careType.name}</div>
                          <StatusBadge tone={record.recordedHere ? "success" : "neutral"}>
                            {getRecordOriginLabel(record.recordedHere, record.sourceLabel)}
                          </StatusBadge>
                          {record.sourceType === "HISTORICAL_BOOKLET" ? (
                            <StatusBadge tone="neutral">{getPreventiveRecordSourceLabel(record.sourceType)}</StatusBadge>
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Given {formatDate(record.administeredOn)} by {record.administeredBy.fullName}
                        </div>
                      </div>
                      <div className="text-right">
                        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {record.nextDueDate ? formatDate(record.nextDueDate) : "Not scheduled"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-secondary/20 p-3 text-xs sm:grid-cols-5">
                      <div>
                        <div className="font-semibold text-foreground">{copy.productLabel}</div>
                        <div className="mt-0.5 text-muted-foreground">{record.productName || "Not recorded"}</div>
                      </div>
                      {category === "vaccines" ? (
                        <>
                          <div>
                            <div className="font-semibold text-foreground">Manufacturer</div>
                            <div className="mt-0.5 text-muted-foreground">{record.manufacturer || "Not recorded"}</div>
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">Lot / batch</div>
                            <div className="mt-0.5 text-muted-foreground">{record.lotNumber || "Not recorded"}</div>
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">Serial</div>
                            <div className="mt-0.5 text-muted-foreground">{record.serialNumber || "Not recorded"}</div>
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">Expiry</div>
                            <div className="mt-0.5 text-muted-foreground">
                              {record.expiryDate ? formatDate(record.expiryDate) : "Not recorded"}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div>
                          <div className="font-semibold text-foreground">Date given</div>
                          <div className="mt-0.5 text-muted-foreground">{formatDate(record.administeredOn)}</div>
                        </div>
                      )}
                    </div>

                    {record.notes ? <div className="mt-2 text-sm text-muted-foreground">{record.notes}</div> : null}
                    {record.sourceNote ? (
                      <div className="mt-2 rounded-2xl border border-border/60 bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
                        Source: {record.sourceNote}
                      </div>
                    ) : null}
                    {record.recordedHere ? (
                      <div className="mt-3">
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/pets/${petId}/preventive/${record.id}/edit`} state={{ from: `/pets/${petId}` }}>
                            Edit
                          </Link>
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No {copy.noResultsLabel} match "{searchQuery.trim()}".
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link to={`/pets/${petId}/preventive`} state={{ from: `/pets/${petId}` }}>
              Open Full Record
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-base font-bold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-3">
        {records.map((record) => {
          const isRecurring = Boolean(record.careType.isRecurring && record.nextDueDate);
          const status = isRecurring ? getDueStatus(record.nextDueDate) : { label: "One time", tone: "neutral" as const };

          return (
            <div key={record.id} className="rounded-2xl border border-border/70 bg-card p-4 shadow-card">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{record.careType.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Recorded by {record.administeredBy.fullName} · {formatDate(record.administeredOn)}
                      </div>
                      {isRecurring &&
                      typeof record.careType.defaultIntervalValue === "number" &&
                      record.careType.defaultIntervalValue > 0 &&
                      record.careType.defaultIntervalUnit ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatCadence(record.careType.defaultIntervalValue, record.careType.defaultIntervalUnit)}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                      <StatusBadge tone={record.recordedHere ? "success" : "neutral"}>
                        {getRecordOriginLabel(record.recordedHere, record.sourceLabel)}
                      </StatusBadge>
                      {record.sourceType === "HISTORICAL_BOOKLET" ? (
                        <StatusBadge tone="neutral">{getPreventiveRecordSourceLabel(record.sourceType)}</StatusBadge>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {isRecurring && record.nextDueDate ? `Next due: ${formatDate(record.nextDueDate)}` : "No repeat scheduled"}
                  </div>
                  {record.productName || record.manufacturer || record.lotNumber || record.serialNumber || record.expiryDate ? (
                    <div className="mt-3 grid grid-cols-1 gap-2 rounded-2xl border border-border/60 bg-secondary/25 p-3 text-xs sm:grid-cols-2">
                      {record.productName ? (
                        <div>
                          <div className="font-semibold text-foreground">Product / medication</div>
                          <div className="mt-0.5 text-muted-foreground">{record.productName}</div>
                        </div>
                      ) : null}
                      {record.manufacturer ? (
                        <div>
                          <div className="font-semibold text-foreground">Manufacturer</div>
                          <div className="mt-0.5 text-muted-foreground">{record.manufacturer}</div>
                        </div>
                      ) : null}
                      {record.lotNumber ? (
                        <div>
                          <div className="font-semibold text-foreground">Lot / batch</div>
                          <div className="mt-0.5 text-muted-foreground">{record.lotNumber}</div>
                        </div>
                      ) : null}
                      {record.serialNumber ? (
                        <div>
                          <div className="font-semibold text-foreground">Serial</div>
                          <div className="mt-0.5 text-muted-foreground">{record.serialNumber}</div>
                        </div>
                      ) : null}
                      {record.expiryDate ? (
                        <div>
                          <div className="font-semibold text-foreground">Expiry</div>
                          <div className="mt-0.5 text-muted-foreground">{formatDate(record.expiryDate)}</div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {record.notes ? <div className="mt-2 text-sm text-muted-foreground">{record.notes}</div> : null}
                  {record.sourceNote ? (
                    <div className="mt-2 rounded-2xl border border-border/60 bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
                      Source: {record.sourceNote}
                    </div>
                  ) : null}
                  {record.recordedHere ? (
                    <div className="mt-3">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/pets/${petId}/preventive/${record.id}/edit`} state={{ from: `/pets/${petId}` }}>
                          Edit
                        </Link>
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to={getCareFormPath(petId, category)} state={{ from: `/pets/${petId}` }}>
            {emptyActionLabel}
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to={`/pets/${petId}/preventive`} state={{ from: `/pets/${petId}` }}>
            Open Full Record
          </Link>
        </Button>
      </div>
    </div>
  );
}

function CareCoachContent({ coach }: { coach: CareCoach }) {
  const Icon = coach.icon;

  return (
    <div className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-2xl bg-card/90 text-current shadow-card">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <div className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-card/80 px-2 py-0.5 text-[10px] font-bold uppercase text-foreground shadow-card">
          <Sparkles className="size-3" />
          {coach.label}
        </div>
        <h2 className="mt-1 line-clamp-2 font-display text-base font-bold leading-tight text-foreground">{coach.title}</h2>
        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{coach.helper}</p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-card/90 px-3 py-2 text-xs font-bold shadow-card">
        {coach.action}
        <ChevronRight className="size-3.5" />
      </span>
    </div>
  );
}
