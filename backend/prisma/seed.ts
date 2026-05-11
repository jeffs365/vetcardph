import { PrismaClient, StaffRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fs from 'node:fs/promises'
import path from 'node:path'

const prisma = new PrismaClient()

const primaryEmail = 'reception@harborviewvet.ph'
const secondaryEmail = 'owner@harborviewvet.ph'
const password = 'password123'

function d(value: string) {
  return new Date(value)
}

function publicAvatar(fileName: string) {
  return `/uploads/pets/avatar/${fileName}`
}

async function preparePetPhotos() {
  const cwd = process.cwd()
  const repoRoot = path.basename(cwd) === 'backend' ? path.dirname(cwd) : cwd
  const sourceDir = path.join(repoRoot, 'web', 'src', 'assets')
  const targetDir = path.join(repoRoot, 'uploads', 'pets', 'avatar')
  const photos = ['pet-luna.jpg', 'pet-max.jpg', 'pet-bella.jpg', 'pet-cooper.jpg', 'pet-oliver.jpg', 'pet-charlie.jpg']

  await fs.rm(targetDir, { recursive: true, force: true })
  await fs.mkdir(targetDir, { recursive: true })

  await Promise.all(
    photos.map(async (photo) => {
      try {
        await fs.copyFile(path.join(sourceDir, photo), path.join(targetDir, photo))
      } catch (error) {
        console.warn(`Could not copy ${photo}; pet will still seed but the avatar may be missing.`)
      }
    }),
  )
}

async function resetDatabase() {
  await prisma.$transaction([
    prisma.authSession.deleteMany(),
    prisma.feedbackSubmission.deleteMany(),
    prisma.auditEntry.deleteMany(),
    prisma.shareToken.deleteMany(),
    prisma.ownerOtp.deleteMany(),
    prisma.preventiveSchedule.deleteMany(),
    prisma.preventiveRecord.deleteMany(),
    prisma.visit.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.petAllergy.deleteMany(),
    prisma.petMedication.deleteMany(),
    prisma.petDietNote.deleteMany(),
    prisma.clinicPetAccess.deleteMany(),
    prisma.careType.deleteMany(),
    prisma.pet.deleteMany(),
    prisma.owner.deleteMany(),
    prisma.staff.deleteMany(),
    prisma.clinic.deleteMany(),
  ])
}

async function main() {
  await preparePetPhotos()
  await resetDatabase()

  const passwordHash = await bcrypt.hash(password, 10)

  const [clinic, partnerClinic] = await prisma.$transaction([
    prisma.clinic.create({
      data: {
        name: 'Harborview Veterinary Clinic',
        phone: '0917 204 8891',
        address: 'Ground Floor, Harborview Arcade, Malolos, Bulacan',
      },
    }),
    prisma.clinic.create({
      data: {
        name: 'Northpoint Animal Hospital',
        phone: '0918 441 2270',
        address: '2nd Avenue, Quezon City',
      },
    }),
  ])

  const [receptionLead, clinicOwner, veterinarian, assistant, partnerVet] = await prisma.$transaction([
    prisma.staff.create({
      data: {
        clinicId: clinic.id,
        fullName: 'Mika Reyes',
        email: primaryEmail,
        phone: '0917 204 8891',
        passwordHash,
        role: StaffRole.RECEPTIONIST,
      },
    }),
    prisma.staff.create({
      data: {
        clinicId: clinic.id,
        fullName: 'Dr. Ana Mercado',
        email: secondaryEmail,
        phone: '0917 204 8892',
        passwordHash,
        role: StaffRole.OWNER,
      },
    }),
    prisma.staff.create({
      data: {
        clinicId: clinic.id,
        fullName: 'Dr. Leo Santos',
        email: 'leo.santos@harborviewvet.ph',
        phone: '0917 204 8893',
        passwordHash,
        role: StaffRole.VETERINARIAN,
      },
    }),
    prisma.staff.create({
      data: {
        clinicId: clinic.id,
        fullName: 'Carla Lim',
        email: 'carla.lim@harborviewvet.ph',
        phone: '0917 204 8894',
        passwordHash,
        role: StaffRole.ASSISTANT,
      },
    }),
    prisma.staff.create({
      data: {
        clinicId: partnerClinic.id,
        fullName: 'Dr. Marco Reyes',
        email: 'marco.reyes@northpointvet.ph',
        phone: '0918 441 2271',
        passwordHash,
        role: StaffRole.VETERINARIAN,
      },
    }),
  ])

  const [rabies, dhpp, deworming, heartworm, dentalRecheck, partnerDeworming] = await prisma.$transaction([
    prisma.careType.create({
      data: {
        clinicId: clinic.id,
        name: 'Rabies Vaccine - 1 Year',
        category: 'VACCINATION',
        defaultIntervalValue: 1,
        defaultIntervalUnit: 'YEAR',
        defaultIntervalDays: 365,
      },
    }),
    prisma.careType.create({
      data: {
        clinicId: clinic.id,
        name: 'DHPPi/L Vaccine',
        category: 'VACCINATION',
        defaultIntervalValue: 1,
        defaultIntervalUnit: 'YEAR',
        defaultIntervalDays: 365,
      },
    }),
    prisma.careType.create({
      data: {
        clinicId: clinic.id,
        name: 'Routine Deworming',
        category: 'DEWORMING',
        defaultIntervalValue: 3,
        defaultIntervalUnit: 'MONTH',
        defaultIntervalDays: 90,
      },
    }),
    prisma.careType.create({
      data: {
        clinicId: clinic.id,
        name: 'Heartworm Prevention',
        category: 'HEARTWORM',
        defaultIntervalValue: 1,
        defaultIntervalUnit: 'MONTH',
        defaultIntervalDays: 30,
      },
    }),
    prisma.careType.create({
      data: {
        clinicId: clinic.id,
        name: 'Dental Recheck',
        category: 'OTHER',
        isRecurring: false,
        defaultIntervalValue: 6,
        defaultIntervalUnit: 'MONTH',
        defaultIntervalDays: 180,
      },
    }),
    prisma.careType.create({
      data: {
        clinicId: partnerClinic.id,
        name: 'Routine Deworming',
        category: 'DEWORMING',
        defaultIntervalValue: 3,
        defaultIntervalUnit: 'MONTH',
        defaultIntervalDays: 90,
      },
    }),
  ])

  const [maria, john, alyssa, daniel, grace] = await prisma.$transaction([
    prisma.owner.create({
      data: {
        fullName: 'Maria Santos',
        mobile: '639171234567',
        address: 'San Fernando, Pampanga',
        email: 'maria.santos@example.com',
        claimedAt: d('2026-04-18T10:20:00+08:00'),
      },
    }),
    prisma.owner.create({
      data: {
        fullName: 'John Lim',
        mobile: '639181234567',
        address: 'Malolos, Bulacan',
        email: 'john.lim@example.com',
        claimedAt: d('2026-04-25T14:05:00+08:00'),
      },
    }),
    prisma.owner.create({
      data: {
        fullName: 'Alyssa Reyes',
        mobile: '639192345678',
        address: 'Quezon City',
        email: 'alyssa.reyes@example.com',
        claimedAt: d('2026-05-01T09:12:00+08:00'),
      },
    }),
    prisma.owner.create({
      data: {
        fullName: 'Daniel Garcia',
        mobile: '639173456789',
        address: 'Makati City',
        email: 'daniel.garcia@example.com',
      },
    }),
    prisma.owner.create({
      data: {
        fullName: 'Grace Tan',
        mobile: '639184567890',
        address: 'Pasig City',
        email: 'grace.tan@example.com',
      },
    }),
  ])

  const [luna, max, bella, cooper, oliver, charlie] = await prisma.$transaction([
    prisma.pet.create({
      data: {
        ownerId: maria.id,
        name: 'Luna',
        avatarUrl: publicAvatar('pet-luna.jpg'),
        species: 'Dog',
        breed: 'French Bulldog',
        color: 'Fawn and black',
        weightKg: 9.2,
        sex: 'FEMALE',
        birthDate: d('2021-08-14T00:00:00+08:00'),
        ageLabel: '4 yr 8 mo',
      },
    }),
    prisma.pet.create({
      data: {
        ownerId: john.id,
        name: 'Max',
        avatarUrl: publicAvatar('pet-max.jpg'),
        species: 'Dog',
        breed: 'German Shepherd',
        color: 'Black and tan',
        weightKg: 31.4,
        sex: 'MALE',
        birthDate: d('2022-03-03T00:00:00+08:00'),
        ageLabel: '4 yr 2 mo',
      },
    }),
    prisma.pet.create({
      data: {
        ownerId: alyssa.id,
        name: 'Bella',
        avatarUrl: publicAvatar('pet-bella.jpg'),
        species: 'Dog',
        breed: 'Golden Retriever',
        color: 'Golden',
        weightKg: 24.1,
        sex: 'FEMALE',
        birthDate: d('2020-11-20T00:00:00+08:00'),
        ageLabel: '5 yr 5 mo',
      },
    }),
    prisma.pet.create({
      data: {
        ownerId: daniel.id,
        name: 'Cooper',
        avatarUrl: publicAvatar('pet-cooper.jpg'),
        species: 'Dog',
        breed: 'Golden Retriever Mix',
        color: 'Golden',
        weightKg: 24.6,
        sex: 'MALE',
        birthDate: d('2023-05-10T00:00:00+08:00'),
        ageLabel: '2 yr 11 mo',
      },
    }),
    prisma.pet.create({
      data: {
        ownerId: grace.id,
        name: 'Oliver',
        avatarUrl: publicAvatar('pet-oliver.jpg'),
        species: 'Cat',
        breed: 'Domestic Shorthair',
        color: 'Orange tabby',
        weightKg: 4.9,
        sex: 'MALE',
        birthDate: d('2019-09-01T00:00:00+08:00'),
        ageLabel: '6 yr 8 mo',
      },
    }),
    prisma.pet.create({
      data: {
        ownerId: maria.id,
        name: 'Charlie',
        avatarUrl: publicAvatar('pet-charlie.jpg'),
        species: 'Dog',
        breed: 'Beagle',
        color: 'Brown and white',
        weightKg: 10.8,
        sex: 'MALE',
        birthDate: d('2024-01-12T00:00:00+08:00'),
        ageLabel: '2 yr 3 mo',
      },
    }),
  ])

  await prisma.clinicPetAccess.createMany({
    data: [
      { clinicId: clinic.id, petId: luna.id },
      { clinicId: clinic.id, petId: max.id },
      { clinicId: clinic.id, petId: bella.id },
      { clinicId: clinic.id, petId: cooper.id },
      { clinicId: clinic.id, petId: oliver.id },
      { clinicId: clinic.id, petId: charlie.id },
      { clinicId: partnerClinic.id, petId: cooper.id },
    ],
  })

  await prisma.petAllergy.createMany({
    data: [
      {
        clinicId: clinic.id,
        petId: luna.id,
        allergen: 'Chicken protein',
        severity: 'Mild',
        reaction: 'Itchy skin and ear redness',
        notes: 'Owner uses salmon-based diet at home.',
      },
      {
        clinicId: clinic.id,
        petId: bella.id,
        allergen: 'Chlorhexidine rinse',
        severity: 'Moderate',
        reaction: 'Facial itching after dental cleaning',
        notes: 'Use iodine-based alternative if needed.',
      },
    ],
  })

  await prisma.petMedication.createMany({
    data: [
      {
        clinicId: clinic.id,
        petId: max.id,
        name: 'Maropitant',
        dose: '8 mg',
        frequency: 'Once daily for 3 days',
        route: 'Oral',
        startDate: d('2026-05-04T00:00:00+08:00'),
        endDate: d('2026-05-06T00:00:00+08:00'),
        notes: 'Dispensed after vomiting consult.',
      },
      {
        clinicId: clinic.id,
        petId: oliver.id,
        name: 'Otic cleanser',
        dose: '2 ml per ear',
        frequency: 'Every evening for 7 days',
        route: 'Topical',
        startDate: d('2026-05-01T00:00:00+08:00'),
        endDate: d('2026-05-07T00:00:00+08:00'),
        notes: 'Owner asked for reminder call if scratching continues.',
      },
    ],
  })

  await prisma.petDietNote.createMany({
    data: [
      {
        clinicId: clinic.id,
        petId: bella.id,
        dietName: 'Dental care kibble',
        remarks: 'Transition over 10 days after dental scaling.',
      },
      {
        clinicId: clinic.id,
        petId: luna.id,
        dietName: 'Salmon sensitive-skin formula',
        remarks: 'Avoid chicken treats during allergy review.',
      },
    ],
  })

  const [cooperCompletedAppointment] = await prisma.$transaction([
    prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        petId: cooper.id,
        createdById: receptionLead.id,
        scheduledFor: d('2026-05-06T10:30:00+08:00'),
        reason: 'Annual wellness and vaccine update',
        notes: 'Owner requested updated digital booklet before travel.',
        status: 'COMPLETED',
      },
    }),
    prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        petId: luna.id,
        createdById: receptionLead.id,
        scheduledFor: d('2026-05-06T09:00:00+08:00'),
        reason: 'Vaccine follow-up and allergy review',
        notes: 'Confirm food allergy plan and check ears.',
      },
    }),
    prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        petId: max.id,
        createdById: receptionLead.id,
        scheduledFor: d('2026-05-06T14:00:00+08:00'),
        reason: 'Vomiting recheck',
        notes: 'Owner reports appetite is improving.',
      },
    }),
    prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        petId: bella.id,
        createdById: receptionLead.id,
        scheduledFor: d('2026-05-06T16:30:00+08:00'),
        reason: 'Dental recheck',
        notes: 'Review gum healing and diet transition.',
      },
    }),
    prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        petId: oliver.id,
        createdById: receptionLead.id,
        scheduledFor: d('2026-05-05T15:00:00+08:00'),
        reason: 'Ear infection recheck',
        notes: 'Call owner if they do not arrive before closing.',
      },
    }),
    prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        petId: charlie.id,
        createdById: receptionLead.id,
        scheduledFor: d('2026-05-04T11:00:00+08:00'),
        reason: 'Nail trim and wellness check',
        notes: 'Owner missed appointment; needs reschedule.',
        status: 'MISSED',
      },
    }),
    prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        petId: luna.id,
        createdById: receptionLead.id,
        scheduledFor: d('2026-05-08T09:30:00+08:00'),
        reason: 'Rabies booster booking',
        notes: 'Bring travel documents for updated record.',
      },
    }),
  ])

  await prisma.visit.createMany({
    data: [
      {
        clinicId: clinic.id,
        petId: luna.id,
        attendedById: veterinarian.id,
        createdById: receptionLead.id,
        visitDate: d('2026-05-05T09:20:00+08:00'),
        weightKg: 9.2,
        reasonForVisit: 'Wellness exam and allergy review',
        findingsNotes: 'Bright, alert, mild ear redness. Skin improved on current diet.',
        treatmentGiven: 'Ear cleaning, diet review, vaccination schedule checked.',
        diagnosis: 'Mild food-related dermatitis',
        followUpNotes: 'Return for rabies booster by May 13.',
      },
      {
        clinicId: clinic.id,
        petId: max.id,
        attendedById: veterinarian.id,
        createdById: assistant.id,
        visitDate: d('2026-05-04T13:45:00+08:00'),
        weightKg: 31.4,
        reasonForVisit: 'Vomiting after diet change',
        findingsNotes: 'Hydrated, abdomen soft, no fever.',
        treatmentGiven: 'Anti-nausea medication dispensed. Bland diet advised.',
        diagnosis: 'Likely dietary upset',
        followUpNotes: 'Phone check on May 6; clinic visit if vomiting returns.',
      },
      {
        clinicId: clinic.id,
        petId: bella.id,
        attendedById: veterinarian.id,
        createdById: receptionLead.id,
        visitDate: d('2026-04-30T11:15:00+08:00'),
        weightKg: 24.1,
        reasonForVisit: 'Dental scaling follow-up',
        findingsNotes: 'Mild gum inflammation, extraction site clean.',
        treatmentGiven: 'Oral rinse adjusted. Dental diet started.',
        diagnosis: 'Post-dental healing',
        followUpNotes: 'Recheck May 6 to confirm gum healing.',
      },
      {
        clinicId: clinic.id,
        petId: cooper.id,
        appointmentId: cooperCompletedAppointment.id,
        attendedById: veterinarian.id,
        createdById: receptionLead.id,
        visitDate: d('2026-05-06T10:45:00+08:00'),
        weightKg: 24.6,
        reasonForVisit: 'Annual wellness and vaccine update',
        findingsNotes: 'Normal exam. Heart and lungs clear. Good body condition.',
        treatmentGiven: 'Heartworm prevention administered and travel record updated.',
        diagnosis: 'Healthy adult dog',
        followUpNotes: 'Next heartworm dose due June 6.',
      },
      {
        clinicId: partnerClinic.id,
        petId: cooper.id,
        attendedById: partnerVet.id,
        createdById: partnerVet.id,
        visitDate: d('2026-03-12T15:00:00+08:00'),
        weightKg: 24.4,
        reasonForVisit: 'Skin irritation while travelling',
        findingsNotes: 'Mild dermatitis on left forelimb.',
        treatmentGiven: 'Topical spray prescribed for 7 days.',
        diagnosis: 'Localized dermatitis',
        followUpNotes: 'History visible to Harborview through shared record.',
      },
    ],
  })

  const [lunaRabies, lunaDeworm, maxDeworm, bellaRabies, cooperHeartworm, oliverRabies, partnerCooperDeworm] =
    await prisma.$transaction([
      prisma.preventiveRecord.create({
        data: {
          clinicId: clinic.id,
          petId: luna.id,
          careTypeId: rabies.id,
          administeredById: veterinarian.id,
          createdById: receptionLead.id,
          administeredOn: d('2025-05-20T10:00:00+08:00'),
          nextDueDate: d('2026-05-13T00:00:00+08:00'),
          productName: 'Nobivac Rabies',
          manufacturer: 'MSD Animal Health',
          lotNumber: 'RB25-LN204',
          serialNumber: 'NV-118204',
          expiryDate: d('2027-01-31T00:00:00+08:00'),
          notes: 'Travel booster due this week.',
        },
      }),
      prisma.preventiveRecord.create({
        data: {
          clinicId: clinic.id,
          petId: luna.id,
          careTypeId: deworming.id,
          administeredById: assistant.id,
          createdById: receptionLead.id,
          administeredOn: d('2026-02-15T10:00:00+08:00'),
          nextDueDate: d('2026-05-12T00:00:00+08:00'),
          productName: 'Drontal Plus',
          manufacturer: 'Bayer',
          lotNumber: 'DW26-084',
          notes: 'Routine dose recorded from in-clinic visit.',
        },
      }),
      prisma.preventiveRecord.create({
        data: {
          clinicId: clinic.id,
          petId: max.id,
          careTypeId: deworming.id,
          administeredById: assistant.id,
          createdById: receptionLead.id,
          administeredOn: d('2026-04-01T10:00:00+08:00'),
          nextDueDate: d('2026-07-01T00:00:00+08:00'),
          productName: 'Profender',
          manufacturer: 'Elanco',
          lotNumber: 'PF26-411',
          notes: 'Topical dewormer applied in clinic.',
        },
      }),
      prisma.preventiveRecord.create({
        data: {
          clinicId: clinic.id,
          petId: bella.id,
          careTypeId: rabies.id,
          administeredById: veterinarian.id,
          createdById: receptionLead.id,
          administeredOn: d('2026-01-12T10:00:00+08:00'),
          nextDueDate: d('2027-01-12T00:00:00+08:00'),
          productName: 'Rabisin',
          manufacturer: 'Boehringer Ingelheim',
          lotNumber: 'RA26-118',
          serialNumber: 'BI-772901',
          expiryDate: d('2027-08-31T00:00:00+08:00'),
          notes: 'Annual rabies vaccination complete.',
        },
      }),
      prisma.preventiveRecord.create({
        data: {
          clinicId: clinic.id,
          petId: cooper.id,
          careTypeId: heartworm.id,
          administeredById: veterinarian.id,
          createdById: receptionLead.id,
          administeredOn: d('2026-05-06T10:45:00+08:00'),
          nextDueDate: d('2026-06-06T00:00:00+08:00'),
          productName: 'Heartgard Plus',
          manufacturer: 'Boehringer Ingelheim',
          lotNumber: 'HW26-602',
          notes: 'Given during annual wellness appointment.',
        },
      }),
      prisma.preventiveRecord.create({
        data: {
          clinicId: clinic.id,
          petId: oliver.id,
          careTypeId: rabies.id,
          administeredById: veterinarian.id,
          createdById: receptionLead.id,
          administeredOn: d('2025-05-01T10:00:00+08:00'),
          nextDueDate: d('2026-05-01T00:00:00+08:00'),
          productName: 'Purevax Rabies',
          manufacturer: 'Boehringer Ingelheim',
          lotNumber: 'PX25-441',
          expiryDate: d('2026-12-31T00:00:00+08:00'),
          sourceType: 'HISTORICAL_BOOKLET',
          sourceNote: 'Copied from owner booklet during first clinic visit.',
          notes: 'Overdue; remind owner at ear recheck.',
        },
      }),
      prisma.preventiveRecord.create({
        data: {
          clinicId: partnerClinic.id,
          petId: cooper.id,
          careTypeId: partnerDeworming.id,
          administeredById: partnerVet.id,
          createdById: partnerVet.id,
          administeredOn: d('2026-03-12T15:00:00+08:00'),
          nextDueDate: d('2026-06-12T00:00:00+08:00'),
          productName: 'Drontal Plus',
          manufacturer: 'Bayer',
          lotNumber: 'DW26-077',
          notes: 'Recorded by Northpoint while owner was travelling.',
        },
      }),
    ])

  await prisma.preventiveSchedule.createMany({
    data: [
      {
        clinicId: clinic.id,
        petId: luna.id,
        careTypeId: rabies.id,
        status: 'OPEN',
        nextDueDate: d('2026-05-13T00:00:00+08:00'),
        sourceRecordId: lunaRabies.id,
      },
      {
        clinicId: clinic.id,
        petId: luna.id,
        careTypeId: deworming.id,
        status: 'OPEN',
        nextDueDate: d('2026-05-12T00:00:00+08:00'),
        sourceRecordId: lunaDeworm.id,
      },
      {
        clinicId: clinic.id,
        petId: max.id,
        careTypeId: deworming.id,
        status: 'OPEN',
        nextDueDate: d('2026-07-01T00:00:00+08:00'),
        sourceRecordId: maxDeworm.id,
      },
      {
        clinicId: clinic.id,
        petId: bella.id,
        careTypeId: rabies.id,
        status: 'OPEN',
        nextDueDate: d('2027-01-12T00:00:00+08:00'),
        sourceRecordId: bellaRabies.id,
      },
      {
        clinicId: clinic.id,
        petId: cooper.id,
        careTypeId: heartworm.id,
        status: 'OPEN',
        nextDueDate: d('2026-06-06T00:00:00+08:00'),
        sourceRecordId: cooperHeartworm.id,
      },
      {
        clinicId: clinic.id,
        petId: cooper.id,
        careTypeId: deworming.id,
        status: 'COMPLETED_ELSEWHERE',
        nextDueDate: d('2026-06-12T00:00:00+08:00'),
        resolvedByRecordId: partnerCooperDeworm.id,
        resolvedAt: d('2026-03-12T15:00:00+08:00'),
      },
      {
        clinicId: clinic.id,
        petId: oliver.id,
        careTypeId: rabies.id,
        status: 'OPEN',
        nextDueDate: d('2026-05-01T00:00:00+08:00'),
        sourceRecordId: oliverRabies.id,
      },
      {
        clinicId: partnerClinic.id,
        petId: cooper.id,
        careTypeId: partnerDeworming.id,
        status: 'OPEN',
        nextDueDate: d('2026-06-12T00:00:00+08:00'),
        sourceRecordId: partnerCooperDeworm.id,
      },
    ],
  })

  await prisma.shareToken.createMany({
    data: [
      {
        ownerId: maria.id,
        petId: luna.id,
        type: 'FULL_PROFILE',
        publicToken: 'luna-travel-record-2026',
        expiresAt: d('2026-06-20T23:59:59+08:00'),
      },
      {
        ownerId: daniel.id,
        petId: cooper.id,
        type: 'EMERGENCY',
        publicToken: 'cooper-emergency-card',
      },
      {
        ownerId: grace.id,
        petId: oliver.id,
        type: 'FULL_PROFILE',
        publicToken: 'oliver-ear-recheck-summary',
        expiresAt: d('2026-05-31T23:59:59+08:00'),
      },
    ],
  })

  await prisma.auditEntry.createMany({
    data: [
      {
        clinicId: clinic.id,
        actorId: receptionLead.id,
        entityType: 'Pet',
        entityId: luna.id,
        action: 'CREATE',
        summary: 'Created Luna profile from first clinic visit.',
      },
      {
        clinicId: clinic.id,
        actorId: veterinarian.id,
        entityType: 'PreventiveRecord',
        entityId: cooperHeartworm.id,
        action: 'CREATE',
        summary: 'Recorded heartworm prevention for Cooper.',
      },
      {
        clinicId: clinic.id,
        actorId: assistant.id,
        entityType: 'PetMedication',
        entityId: max.id,
        action: 'CREATE',
        summary: 'Added short course medication note for Max.',
      },
    ],
  })

  console.log('Seeded polished screen-recording data.')
  console.log(`Clinic login: ${primaryEmail} / ${password}`)
  console.log(`Owner workspace sample phone: ${maria.mobile}`)
  console.log(`Primary clinic: ${clinic.name}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
