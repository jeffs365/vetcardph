import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { parseDateInput } from '../lib/dates'
import {
  deleteStoredPetAvatar,
  isAcceptedPetAvatarValue,
  resolvePetAvatarUrl,
  storePetAvatar,
} from '../lib/pet-avatars'
import { requireOwnerSession } from '../lib/owner-session'
import {
  toAccessSummary,
  toOwnerSummary,
  toPetAllergy,
  toPetDietNote,
  toPetMedication,
  toPreventiveHistoryRecord,
  toVisitHistoryRecord,
} from '../lib/serializers'

const ownerPetSchema = z.object({
  petName: z.string().trim().min(1).max(80),
  avatarUrl: z.string().trim().max(512).refine(isAcceptedPetAvatarValue).optional().or(z.literal('')),
  species: z.string().trim().min(1).max(40),
  breed: z.string().trim().min(1).max(80),
  color: z.string().trim().min(1).max(80),
  weightKg: z.number().positive().max(200).optional(),
  sex: z.enum(['MALE', 'FEMALE', 'UNKNOWN']),
  birthDate: z.string().optional().or(z.literal('')),
  ageLabel: z.string().trim().max(40).optional().or(z.literal('')),
})

export const ownerPetRoutes: FastifyPluginAsync = async (app) => {
  app.post('/pets/avatar/upload', async (request, reply) => {
    const session = await requireOwnerSession(request, reply)
    if (!session) {
      return
    }

    const file = await request.file()
    if (!file) {
      return reply.code(400).send({ message: 'Image file is required.' })
    }

    if (!file.mimetype.startsWith('image/')) {
      return reply.code(400).send({ message: 'Only image uploads are allowed.' })
    }

    const buffer = await file.toBuffer()
    if (!buffer.length) {
      return reply.code(400).send({ message: 'Uploaded image is empty.' })
    }

    try {
      const avatarUrl = await storePetAvatar({
        buffer,
        scope: 'owner',
        scopeId: session.ownerId,
      })

      return reply.code(201).send({ avatarUrl })
    } catch (error) {
      request.log.error({ err: error }, 'Owner pet avatar upload failed.')
      return reply.code(400).send({ message: 'Could not process that image file.' })
    }
  })

  app.post('/pets', async (request, reply) => {
    const session = await requireOwnerSession(request, reply)
    if (!session) {
      return
    }

    const input = ownerPetSchema.parse(request.body)
    const birthDate = input.birthDate ? parseDateInput(input.birthDate) : null

    const pet = await prisma.pet.create({
      data: {
        ownerId: session.ownerId,
        name: input.petName,
        avatarUrl: input.avatarUrl || null,
        species: input.species,
        breed: input.breed,
        color: input.color,
        weightKg: input.weightKg,
        sex: input.sex,
        birthDate,
        ageLabel: input.ageLabel || null,
      },
      select: {
        id: true,
      },
    })

    return reply.code(201).send({ pet })
  })

  app.put('/pets/:petId', async (request, reply) => {
    const session = await requireOwnerSession(request, reply)
    if (!session) {
      return
    }

    const params = z.object({ petId: z.string().min(1) }).parse(request.params)
    const input = ownerPetSchema.parse(request.body)
    const birthDate = input.birthDate ? parseDateInput(input.birthDate) : null

    const existing = await prisma.pet.findFirst({
      where: {
        id: params.petId,
        ownerId: session.ownerId,
      },
      select: {
        id: true,
        avatarUrl: true,
      },
    })

    if (!existing) {
      return reply.code(404).send({ message: 'Pet not found.' })
    }

    const previousAvatarUrl = existing.avatarUrl
    const nextAvatarUrl = input.avatarUrl === '' ? null : input.avatarUrl ?? existing.avatarUrl

    const pet = await prisma.pet.update({
      where: { id: existing.id },
      data: {
        name: input.petName,
        avatarUrl: nextAvatarUrl,
        species: input.species,
        breed: input.breed,
        color: input.color,
        weightKg: input.weightKg,
        sex: input.sex,
        birthDate,
        ageLabel: input.ageLabel || null,
      },
      select: {
        id: true,
      },
    })

    if (previousAvatarUrl && previousAvatarUrl !== nextAvatarUrl) {
      try {
        await deleteStoredPetAvatar(previousAvatarUrl)
      } catch (error) {
        request.log.warn({ err: error, petId: existing.id }, 'Previous owner pet avatar cleanup failed.')
      }
    }

    return { pet }
  })

  app.get('/pets', async (request, reply) => {
    const session = await requireOwnerSession(request, reply)
    if (!session) {
      return
    }

    const pets = await prisma.pet.findMany({
      where: {
        ownerId: session.ownerId,
      },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            mobile: true,
            address: true,
            email: true,
          },
        },
        clinicAccesses: {
          select: {
            clinicId: true,
            clinic: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
    })

    return {
      pets: await Promise.all(pets.map(async (pet) => ({
        id: pet.id,
        name: pet.name,
        avatarUrl: await resolvePetAvatarUrl(pet.avatarUrl),
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
        clinics: pet.clinicAccesses.map((access) => access.clinic),
      }))),
    }
  })

  app.get('/pets/:petId', async (request, reply) => {
    const session = await requireOwnerSession(request, reply)
    if (!session) {
      return
    }

    const params = z.object({ petId: z.string().min(1) }).parse(request.params)

    const pet = await prisma.pet.findFirst({
      where: {
        id: params.petId,
        ownerId: session.ownerId,
      },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            mobile: true,
            address: true,
            email: true,
          },
        },
        clinicAccesses: {
          select: {
            clinicId: true,
            clinic: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        visits: {
          orderBy: [{ visitDate: 'desc' }, { createdAt: 'desc' }],
          include: {
            attendedBy: { select: { id: true, fullName: true, role: true } },
            clinic: { select: { id: true, name: true } },
          },
        },
        appointments: {
          orderBy: { scheduledFor: 'asc' },
          include: {
            createdBy: {
              select: {
                fullName: true,
                role: true,
              },
            },
            clinic: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        preventiveRecords: {
          orderBy: [{ administeredOn: 'desc' }, { createdAt: 'desc' }],
          include: {
            careType: true,
            administeredBy: { select: { fullName: true, role: true } },
            clinic: { select: { id: true, name: true } },
          },
        },
        allergies: {
          where: { isActive: true },
          orderBy: { updatedAt: 'desc' },
          include: { clinic: { select: { name: true } } },
        },
        medications: {
          where: { isActive: true },
          orderBy: { updatedAt: 'desc' },
          include: { clinic: { select: { name: true } } },
        },
        dietNotes: {
          where: { isActive: true },
          orderBy: { updatedAt: 'desc' },
          include: { clinic: { select: { name: true } } },
        },
      },
    })

    if (!pet) {
      return reply.code(404).send({ message: 'Pet not found.' })
    }

    return {
      pet: {
        id: pet.id,
        name: pet.name,
        avatarUrl: await resolvePetAvatarUrl(pet.avatarUrl),
        species: pet.species,
        breed: pet.breed,
        color: pet.color,
        weightKg: pet.weightKg,
        sex: pet.sex,
        birthDate: pet.birthDate,
        ageLabel: pet.ageLabel,
        owner: toOwnerSummary(pet.owner),
        accessSummary: toAccessSummary({
          linkedClinicCount: pet.clinicAccesses.length,
          currentClinicId: '',
          visits: pet.visits,
          preventiveRecords: pet.preventiveRecords,
        }),
        clinics: pet.clinicAccesses.map((access) => access.clinic),
        visits: pet.visits.map((visit) => ({
          ...toVisitHistoryRecord(visit, visit.clinicId),
          clinicName: visit.clinic.name,
        })),
        appointments: pet.appointments.map((appointment) => ({
          ...appointment,
          clinic: appointment.clinic,
        })),
        preventiveRecords: pet.preventiveRecords.map((record) => ({
          ...toPreventiveHistoryRecord(record, record.clinicId),
          clinicName: record.clinic.name,
        })),
        allergies: pet.allergies.map((allergy) => toPetAllergy(allergy)),
        medications: pet.medications.map((medication) => toPetMedication(medication)),
        dietNotes: pet.dietNotes.map((dietNote) => toPetDietNote(dietNote)),
      },
    }
  })
}
