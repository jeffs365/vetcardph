import type { AppointmentStatus, FeedbackCategory, IntervalUnit, PreventiveRecordSource, StaffRole } from "@/lib/api";

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-PH", {
  hour: "numeric",
  minute: "2-digit",
});

export function formatDate(value: string | Date | null | undefined) {
  if (!value) {
    return "Not set";
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : dateFormatter.format(date);
}

export function toDateInputValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toTimeInputValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) {
    return "Not set";
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : `${formatDate(date)} · ${timeFormatter.format(date)}`;
}

export function formatTime(value: string | Date | null | undefined) {
  if (!value) {
    return "Not set";
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid time" : timeFormatter.format(date);
}

export function normalizePhilippineMobileInput(value: string) {
  const digits = value.trim().replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("63") && digits.length === 12) {
    return digits;
  }

  if (digits.startsWith("09") && digits.length === 11) {
    return `63${digits.slice(1)}`;
  }

  if (digits.startsWith("9") && digits.length === 10) {
    return `63${digits}`;
  }

  return digits;
}

export function formatPhoneForDisplay(value: string | null | undefined) {
  if (!value?.trim()) {
    return "No phone";
  }

  const normalized = normalizePhilippineMobileInput(value);
  if (normalized.startsWith("63") && normalized.length === 12) {
    return `0${normalized.slice(2)}`;
  }

  return value.trim();
}

export function toPhoneHref(value: string | null | undefined) {
  if (!value?.trim()) {
    return "";
  }

  const normalized = normalizePhilippineMobileInput(value);
  if (normalized.startsWith("63") && normalized.length === 12) {
    return `+${normalized}`;
  }

  return value.trim();
}

export function getElsewhereLabel(
  summary: { linkedClinicCount: number; hasSharedHistory: boolean } | null | undefined,
) {
  if (!summary?.hasSharedHistory) {
    return null;
  }

  if (summary.linkedClinicCount > 1) {
    return "Shared history is available from elsewhere.";
  }

  return "This pet includes records completed elsewhere.";
}

export function getRecordOriginLabel(recordedHere: boolean, sourceLabel: string) {
  return recordedHere ? "Recorded here" : sourceLabel;
}

export function getPreventiveRecordSourceLabel(sourceType: PreventiveRecordSource | null | undefined) {
  return sourceType === "HISTORICAL_BOOKLET" ? "Historical booklet" : "Clinic recorded";
}

function getAgeInMonthsFromDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  const today = new Date();
  let months =
    (today.getFullYear() - birthDate.getFullYear()) * 12 +
    (today.getMonth() - birthDate.getMonth());

  if (today.getDate() < birthDate.getDate()) {
    months -= 1;
  }

  return months >= 0 ? months : null;
}

function getAgeInMonthsFromLabel(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(year|yr|y|month|mo|m|week|wk|w)/);
  if (!match) {
    return null;
  }

  const amount = Number.parseFloat(match[1] ?? "");
  if (!Number.isFinite(amount)) {
    return null;
  }

  const unit = match[2];
  if (unit === "year" || unit === "yr" || unit === "y") {
    return Math.round(amount * 12);
  }

  if (unit === "week" || unit === "wk" || unit === "w") {
    return Math.max(0, Math.round(amount / 4.345));
  }

  return Math.round(amount);
}

export function getAgeInMonths(birthDate?: string | null, ageLabel?: string | null) {
  return getAgeInMonthsFromDate(birthDate) ?? getAgeInMonthsFromLabel(ageLabel);
}

export function getPetAgeLabel(birthDate?: string | null, ageLabel?: string | null) {
  const months = getAgeInMonths(birthDate, ageLabel);

  if (months === null) {
    return ageLabel?.trim() || "Unknown age";
  }

  if (months < 1) {
    return "< 1 mo";
  }

  if (months < 12) {
    return `${months} mo`;
  }

  const years = Math.floor(months / 12);
  const remainderMonths = months % 12;

  if (!remainderMonths) {
    return `${years} yr${years > 1 ? "s" : ""}`;
  }

  return `${years} yr ${remainderMonths} mo`;
}

export function formatWeightKg(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "No weight";
  }

  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} kg`;
}

export function getPetAgeBucket(birthDate?: string | null, ageLabel?: string | null) {
  const months = getAgeInMonths(birthDate, ageLabel);

  if (months === null) {
    return "unknown";
  }

  if (months < 12) {
    return "under-1";
  }

  if (months < 48) {
    return "1-3";
  }

  if (months < 96) {
    return "4-7";
  }

  return "8-plus";
}

export function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");
}

export function getPetTypeLabel(species?: string | null) {
  const normalized = species?.toLowerCase() ?? "";

  if (normalized.includes("dog") || normalized.includes("canine")) {
    return "Dog";
  }

  if (normalized.includes("cat") || normalized.includes("feline")) {
    return "Cat";
  }

  return species?.trim() ? titleCase(species) : "Unknown";
}

export function formatRole(role: StaffRole) {
  return titleCase(role.replace(/_/g, " "));
}

export function formatAppointmentStatus(status: AppointmentStatus) {
  return titleCase(status.replace(/_/g, " "));
}

export function formatFeedbackCategory(category: FeedbackCategory) {
  return titleCase(category.replace(/_/g, " "));
}

export function formatCadence(value: number, unit: IntervalUnit) {
  const normalizedUnit =
    unit === "DAY" ? "day" : unit === "WEEK" ? "week" : unit === "MONTH" ? "month" : "year";
  const suffix = value === 1 ? normalizedUnit : `${normalizedUnit}s`;
  return `Every ${value} ${suffix}`;
}

export function getDueStatus(nextDueDate: string | null | undefined) {
  if (!nextDueDate) {
    return {
      label: "No due date",
      tone: "neutral" as const,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(nextDueDate);
  target.setHours(0, 0, 0, 0);

  if (Number.isNaN(target.getTime())) {
    return {
      label: "No due date",
      tone: "neutral" as const,
    };
  }

  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (days < 0) {
    return {
      label: `${Math.abs(days)}d overdue`,
      tone: "danger" as const,
    };
  }

  if (days === 0) {
    return {
      label: "Due today",
      tone: "warn" as const,
    };
  }

  if (days <= 7) {
    return {
      label: `Due in ${days}d`,
      tone: "warn" as const,
    };
  }

  return {
    label: `Next due in ${days}d`,
    tone: "success" as const,
  };
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

export function getInitials(value: string) {
  const letters = value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return letters || "VC";
}

export function getPetAccent(species?: string | null) {
  const normalized = species?.toLowerCase() ?? "";

  if (normalized.includes("feline") || normalized.includes("cat")) {
    return "bg-tertiary-soft text-tertiary";
  }

  if (normalized.includes("canine") || normalized.includes("dog")) {
    return "bg-primary-soft text-primary";
  }

  return "bg-accent text-accent-foreground";
}

export function getPetColorSwatch(color?: string | null) {
  const normalized = color?.trim().toLowerCase() ?? "";

  if (!normalized) {
    return "hsl(var(--muted-foreground))";
  }

  if (normalized.startsWith("#")) {
    return normalized;
  }

  const palette: Array<[string, string]> = [
    ["white", "#f5f5f4"],
    ["cream", "#f5e6c8"],
    ["beige", "#d6c1a3"],
    ["tan", "#c19a6b"],
    ["gold", "#d4af37"],
    ["golden", "#d4af37"],
    ["yellow", "#d4af37"],
    ["orange", "#d97706"],
    ["red", "#b91c1c"],
    ["brown", "#8b5e3c"],
    ["chocolate", "#5b3a29"],
    ["black", "#1f2937"],
    ["gray", "#6b7280"],
    ["grey", "#6b7280"],
    ["silver", "#9ca3af"],
    ["blue", "#2563eb"],
    ["green", "#15803d"],
    ["purple", "#7c3aed"],
    ["pink", "#ec4899"],
  ];

  const match = palette.find(([name]) => normalized.includes(name));
  return match?.[1] ?? "#9ca3af";
}
