import type { Clinic, Owner, Staff } from '@prisma/client'

export function toSessionUser(staff: Staff, clinic: Clinic) {
  return {
    staffId: staff.id,
    clinicId: clinic.id,
    role: staff.role,
    fullName: staff.fullName,
    email: staff.email,
    phone: staff.phone,
    clinicName: clinic.name,
    clinicPhone: clinic.phone,
    clinicAddress: clinic.address,
  }
}

export function toOwnerSummary(owner: Pick<Owner, 'id' | 'fullName' | 'mobile' | 'address' | 'email'>) {
  return {
    id: owner.id,
    fullName: owner.fullName,
    mobile: owner.mobile,
    address: owner.address,
    email: owner.email,
  }
}

export function toPetListItem<
  T extends {
    id: string
    name: string
    avatarUrl: string | null
    species: string
    breed: string
    color: string
    weightKg: number | null
    sex: 'MALE' | 'FEMALE' | 'UNKNOWN'
    birthDate: Date | null
    ageLabel: string | null
    updatedAt: Date
    owner: Pick<Owner, 'id' | 'fullName' | 'mobile' | 'address' | 'email'>
    clinicAccesses: Array<{ clinicId: string }>
  },
>(pet: T) {
  return {
    id: pet.id,
    name: pet.name,
    avatarUrl: pet.avatarUrl,
    species: pet.species,
    breed: pet.breed,
    color: pet.color,
    weightKg: pet.weightKg,
    sex: pet.sex,
    birthDate: pet.birthDate,
    ageLabel: pet.ageLabel,
    updatedAt: pet.updatedAt,
    owner: toOwnerSummary(pet.owner),
    accessSummary: {
      linkedClinicCount: pet.clinicAccesses.length,
      hasSharedHistory: pet.clinicAccesses.length > 1,
    },
  }
}

export function toAccessSummary(input: {
  linkedClinicCount: number
  currentClinicId: string
  visits?: Array<{ clinicId: string }>
  preventiveRecords?: Array<{ clinicId: string }>
}) {
  const hasExternalHistory =
    (input.visits ?? []).some((visit) => visit.clinicId !== input.currentClinicId) ||
    (input.preventiveRecords ?? []).some((record) => record.clinicId !== input.currentClinicId)

  return {
    linkedClinicCount: input.linkedClinicCount,
    hasSharedHistory: hasExternalHistory || input.linkedClinicCount > 1,
  }
}

export function toVisitHistoryRecord<
  T extends {
    id: string
    clinicId: string
    appointmentId: string | null
    visitDate: Date
    weightKg: number | null
    reasonForVisit: string
    findingsNotes: string
    treatmentGiven: string
    diagnosis: string | null
    followUpNotes: string | null
    attendedBy: {
      id?: string
      fullName: string
      role: Staff['role']
    }
  },
>(visit: T, currentClinicId: string) {
  const recordedHere = visit.clinicId === currentClinicId

  return {
    id: visit.id,
    appointmentId: visit.appointmentId,
    visitDate: visit.visitDate,
    weightKg: visit.weightKg,
    reasonForVisit: visit.reasonForVisit,
    findingsNotes: visit.findingsNotes,
    treatmentGiven: visit.treatmentGiven,
    diagnosis: visit.diagnosis,
    followUpNotes: visit.followUpNotes,
    recordedHere,
    sourceLabel: recordedHere ? 'Recorded here' : 'Recorded elsewhere',
    attendedBy: visit.attendedBy,
  }
}

export function toPreventiveHistoryRecord<
  T extends {
    id: string
    clinicId: string
    administeredOn: Date
    nextDueDate: Date | null
    dueDateOverridden: boolean
    notes: string | null
    careType: {
      id?: string
      name: string
      category?: 'VACCINATION' | 'DEWORMING' | 'HEARTWORM' | 'OTHER'
      isRecurring?: boolean
      defaultIntervalValue?: number
      defaultIntervalUnit?: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
      defaultIntervalDays?: number
    }
    productName: string | null
    manufacturer: string | null
    lotNumber: string | null
    serialNumber: string | null
    expiryDate: Date | null
    sourceType?: 'CLINIC_RECORDED' | 'HISTORICAL_BOOKLET'
    sourceNote?: string | null
    administeredBy: {
      fullName: string
      role: Staff['role']
    }
  },
>(record: T, currentClinicId: string) {
  const recordedHere = record.clinicId === currentClinicId

  return {
    id: record.id,
    administeredOn: record.administeredOn,
    nextDueDate: record.nextDueDate,
    dueDateOverridden: record.dueDateOverridden,
    productName: record.productName,
    manufacturer: record.manufacturer,
    lotNumber: record.lotNumber,
    serialNumber: record.serialNumber,
    expiryDate: record.expiryDate,
    sourceType: record.sourceType ?? 'CLINIC_RECORDED',
    sourceNote: record.sourceNote ?? null,
    notes: record.notes,
    recordedHere,
    sourceLabel: recordedHere ? 'Recorded here' : 'Completed elsewhere',
    careType: record.careType,
    administeredBy: record.administeredBy,
  }
}

export function toPetAllergy<
  T extends {
    id: string
    allergen: string
    severity: string | null
    reaction: string | null
    notes: string | null
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    clinicId?: string
    clinic?: { name: string }
  },
>(allergy: T, currentClinicId?: string) {
  return {
    id: allergy.id,
    allergen: allergy.allergen,
    severity: allergy.severity,
    reaction: allergy.reaction,
    notes: allergy.notes,
    isActive: allergy.isActive,
    createdAt: allergy.createdAt,
    updatedAt: allergy.updatedAt,
    clinicName: allergy.clinic?.name ?? null,
    recordedHere: currentClinicId ? allergy.clinicId === currentClinicId : false,
  }
}

export function toPetMedication<
  T extends {
    id: string
    name: string
    dose: string | null
    frequency: string | null
    route: string | null
    startDate: Date | null
    endDate: Date | null
    notes: string | null
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    clinicId?: string
    clinic?: { name: string }
  },
>(medication: T, currentClinicId?: string) {
  return {
    id: medication.id,
    name: medication.name,
    dose: medication.dose,
    frequency: medication.frequency,
    route: medication.route,
    startDate: medication.startDate,
    endDate: medication.endDate,
    notes: medication.notes,
    isActive: medication.isActive,
    createdAt: medication.createdAt,
    updatedAt: medication.updatedAt,
    clinicName: medication.clinic?.name ?? null,
    recordedHere: currentClinicId ? medication.clinicId === currentClinicId : false,
  }
}

export function toPetDietNote<
  T extends {
    id: string
    dietName: string
    remarks: string | null
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    clinicId?: string
    clinic?: { name: string }
  },
>(dietNote: T, currentClinicId?: string) {
  return {
    id: dietNote.id,
    dietName: dietNote.dietName,
    remarks: dietNote.remarks,
    isActive: dietNote.isActive,
    createdAt: dietNote.createdAt,
    updatedAt: dietNote.updatedAt,
    clinicName: dietNote.clinic?.name ?? null,
    recordedHere: currentClinicId ? dietNote.clinicId === currentClinicId : false,
  }
}
