export type StaffRole = "OWNER" | "VETERINARIAN" | "ASSISTANT" | "RECEPTIONIST";
export type IntervalUnit = "DAY" | "WEEK" | "MONTH" | "YEAR";
export type CareCategory = "VACCINATION" | "DEWORMING" | "HEARTWORM" | "OTHER";
export type PreventiveRecordSource = "CLINIC_RECORDED" | "HISTORICAL_BOOKLET";
export type AppointmentStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "MISSED";
export type FeedbackCategory = "BUG" | "IDEA" | "FEATURE_REQUEST" | "GENERAL";
export type ShareTokenType = "EMERGENCY" | "FULL_PROFILE";

export type SessionUser = {
  staffId: string;
  clinicId: string;
  clinicName: string;
  clinicPhone: string | null;
  clinicAddress: string | null;
  role: StaffRole;
  fullName: string;
  email: string;
  phone: string | null;
};

export type OwnerSessionUser = {
  kind: "owner";
  ownerId: string;
  fullName: string;
  mobile: string;
  email: string | null;
  address: string | null;
  claimedAt: string | null;
};

export type StaffMember = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  isActive: boolean;
};

export type OwnerSummary = {
  id: string;
  fullName: string;
  mobile: string;
  address: string;
  email: string | null;
};

export type PetAccessSummary = {
  linkedClinicCount: number;
  hasSharedHistory: boolean;
};

export type CareType = {
  id: string;
  name: string;
  category: CareCategory;
  defaultIntervalValue: number;
  defaultIntervalUnit: IntervalUnit;
  defaultIntervalDays: number;
  isActive: boolean;
};

export type PetListItem = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  species: string;
  breed: string;
  color: string;
  weightKg?: number | null;
  sex: "MALE" | "FEMALE" | "UNKNOWN";
  birthDate: string | null;
  ageLabel: string | null;
  updatedAt: string;
  owner: OwnerSummary;
  accessSummary: PetAccessSummary;
};

export type OwnerPetListItem = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  species: string;
  breed: string;
  color: string;
  weightKg?: number | null;
  sex: "MALE" | "FEMALE" | "UNKNOWN";
  birthDate: string | null;
  ageLabel: string | null;
  updatedAt: string;
  owner: OwnerSummary;
  accessSummary: PetAccessSummary;
  clinics: Array<{
    id: string;
    name: string;
  }>;
};

export type LinkPetCandidate = PetListItem & {
  linkedToCurrentClinic: boolean;
};

export type LinkPetLookupResult = {
  owner: OwnerSummary | null;
  pets: LinkPetCandidate[];
};

export type VisitRecord = {
  id: string;
  appointmentId?: string | null;
  visitDate: string;
  weightKg?: number | null;
  reasonForVisit: string;
  findingsNotes: string;
  treatmentGiven: string;
  diagnosis: string | null;
  followUpNotes: string | null;
  recordedHere: boolean;
  sourceLabel: string;
  attendedBy: {
    id?: string;
    fullName: string;
    role: StaffRole;
  };
};

export type CalendarVisitRecord = VisitRecord & {
  appointmentId?: string | null;
  pet: {
    id: string;
    name: string;
    species: string;
    breed: string;
    color: string;
    sex: "MALE" | "FEMALE" | "UNKNOWN";
    owner: OwnerSummary;
  };
};

export type PreventiveRecord = {
  id: string;
  administeredOn: string;
  nextDueDate: string | null;
  dueDateOverridden: boolean;
  productName: string | null;
  manufacturer: string | null;
  lotNumber: string | null;
  serialNumber: string | null;
  expiryDate: string | null;
  sourceType: PreventiveRecordSource;
  sourceNote: string | null;
  notes: string | null;
  recordedHere: boolean;
  sourceLabel: string;
  careType: {
    id?: string;
    name: string;
    category?: CareCategory;
    isRecurring?: boolean;
    defaultIntervalValue?: number;
    defaultIntervalUnit?: IntervalUnit;
    defaultIntervalDays?: number;
  };
  administeredBy: {
    fullName: string;
    role: StaffRole;
  };
};

export type PetAppointment = {
  id: string;
  scheduledFor: string;
  reason: string;
  notes: string;
  status: AppointmentStatus;
  createdBy: {
    fullName: string;
    role: StaffRole;
  };
};

export type PetAllergy = {
  id: string;
  allergen: string;
  severity: string | null;
  reaction: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  clinicName: string | null;
  recordedHere: boolean;
};

export type PetMedication = {
  id: string;
  name: string;
  dose: string | null;
  frequency: string | null;
  route: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  clinicName: string | null;
  recordedHere: boolean;
};

export type PetDietNote = {
  id: string;
  dietName: string;
  remarks: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  clinicName: string | null;
  recordedHere: boolean;
};

export type PetDetail = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  species: string;
  breed: string;
  color: string;
  weightKg?: number | null;
  sex: "MALE" | "FEMALE" | "UNKNOWN";
  birthDate: string | null;
  ageLabel: string | null;
  owner: OwnerSummary;
  accessSummary: PetAccessSummary;
  visits: VisitRecord[];
  appointments: PetAppointment[];
  preventiveRecords: PreventiveRecord[];
  allergies: PetAllergy[];
  medications: PetMedication[];
  dietNotes: PetDietNote[];
};

export type OwnerAppointment = {
  id: string;
  scheduledFor: string;
  reason: string;
  notes: string;
  status: AppointmentStatus;
  clinic: {
    id: string;
    name: string;
    phone: string | null;
  };
  createdBy: {
    fullName: string;
    role: StaffRole;
  };
};

export type OwnerVisitRecord = VisitRecord & {
  clinicName: string;
};

export type OwnerPreventiveRecord = PreventiveRecord & {
  clinicName: string;
};

export type OwnerPetDetail = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  species: string;
  breed: string;
  color: string;
  weightKg?: number | null;
  sex: "MALE" | "FEMALE" | "UNKNOWN";
  birthDate: string | null;
  ageLabel: string | null;
  owner: OwnerSummary;
  accessSummary: PetAccessSummary;
  clinics: Array<{
    id: string;
    name: string;
    phone: string | null;
  }>;
  visits: OwnerVisitRecord[];
  appointments: OwnerAppointment[];
  preventiveRecords: OwnerPreventiveRecord[];
  allergies: PetAllergy[];
  medications: PetMedication[];
  dietNotes: PetDietNote[];
};

export type OwnerShareToken = {
  id: string;
  petId: string;
  type: ShareTokenType;
  publicToken: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastViewedAt: string | null;
  viewCount: number;
  createdAt: string;
  isActive: boolean;
  pet?: {
    id: string;
    name: string;
    species: string;
    breed: string;
    avatarUrl?: string | null;
  };
};

export type PublicEmergencyShare = {
  type: "EMERGENCY";
  expiresAt: string | null;
  pet: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    species: string;
    breed: string;
    color: string;
    weightKg?: number | null;
    sex: "MALE" | "FEMALE" | "UNKNOWN";
    birthDate: string | null;
    ageLabel: string | null;
    allergies: PetAllergy[];
    medications: PetMedication[];
    dietNotes: PetDietNote[];
  };
  emergencyContact: {
    fullName: string;
    mobile: string;
  };
  linkedClinics: Array<{
    id: string;
    name: string;
    phone: string | null;
  }>;
};

export type PublicFullProfileShare = {
  type: "FULL_PROFILE";
  expiresAt: string | null;
  pet: OwnerPetDetail;
};

export type DueRecord = {
  id: string;
  nextDueDate: string;
  pet: {
    id: string;
    name: string;
    species: string;
    owner: OwnerSummary;
  };
  careType: {
    name: string;
    category?: CareCategory;
    defaultIntervalValue: number;
    defaultIntervalUnit: IntervalUnit;
    defaultIntervalDays: number;
  };
};

export type AppointmentRecord = {
  id: string;
  scheduledFor: string;
  reason: string;
  notes: string;
  status: AppointmentStatus;
  pet: {
    id: string;
    name: string;
    species: string;
    breed: string;
    color: string;
    sex: "MALE" | "FEMALE" | "UNKNOWN";
    avatarUrl?: string | null;
    birthDate?: string | null;
    ageLabel?: string | null;
    weightKg?: number | null;
    owner: OwnerSummary;
  };
  createdBy: {
    id: string;
    fullName: string;
    role: StaffRole;
  };
};

export type AppointmentSummary = {
  today: number;
  due: number;
  upcoming: number;
};

export type DashboardSummary = {
  petCount: number;
  overdueCount: number;
  dueSoonCount: number;
  recentVisits: Array<
    VisitRecord & {
      pet: {
        id: string;
        name: string;
      };
    }
  >;
  recentDueRecords: DueRecord[];
};

export type FeedbackItem = {
  id: string;
  category: FeedbackCategory;
  message: string;
  createdAt: string;
  staff: {
    id: string;
    fullName: string;
    role: StaffRole;
  };
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  token?: string | null;
  body?: unknown;
  timeoutMs?: number;
  retryOnUnauthorized?: boolean;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const DEFAULT_TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function inferRefreshPath(path: string, options: RequestOptions) {
  if (options.retryOnUnauthorized === false) {
    return null;
  }

  if (
    path.endsWith("/login") ||
    path.endsWith("/register") ||
    path.endsWith("/register-clinic") ||
    path.endsWith("/request-code") ||
    path.endsWith("/verify-code") ||
    path.endsWith("/refresh") ||
    path.endsWith("/logout")
  ) {
    return null;
  }

  if (path.startsWith("/owner") || path.startsWith("/owner-auth")) {
    return "/owner-auth/refresh";
  }

  if (options.token || path === "/auth/me") {
    return "/auth/refresh";
  }

  return null;
}

function isUnsafeMethod(method: RequestOptions["method"] | undefined) {
  return !["GET", "HEAD"].includes(method ?? "GET");
}

function csrfCookieName(path: string) {
  return path.startsWith("/owner") || path.startsWith("/owner-auth") ? "vc_owner_csrf" : "vc_staff_csrf";
}

function readCookie(name: string) {
  const encodedName = `${encodeURIComponent(name)}=`;
  const parts = document.cookie ? document.cookie.split("; ") : [];
  const match = parts.find((part) => part.startsWith(encodedName));
  return match ? decodeURIComponent(match.slice(encodedName.length)) : null;
}

async function performRequest(path: string, options: RequestOptions) {
  const headers: Record<string, string> = {};
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  let requestBody: BodyInit | undefined;
  const method = options.method ?? "GET";

  if (options.body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (options.body !== undefined) {
    requestBody = isFormData ? (options.body as FormData) : JSON.stringify(options.body);
  }

  if (isUnsafeMethod(method)) {
    const csrfToken = readCookie(csrfCookieName(path));
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: requestBody,
      credentials: "include",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Network is taking too long. Please try again.", 408);
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  return response;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await performRequest(path, options);

  if (response.status === 401) {
    const refreshPath = inferRefreshPath(path, options);

    if (refreshPath) {
      const refreshResponse = await performRequest(refreshPath, {
        method: "POST",
        retryOnUnauthorized: false,
        timeoutMs: options.timeoutMs,
      }).catch(() => null);

      if (refreshResponse?.ok) {
        response = await performRequest(path, options);
      }
    }
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(payload?.message ?? "Request failed.", response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
