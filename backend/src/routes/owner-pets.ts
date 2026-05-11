import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { parseDateInput } from '../lib/dates'
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
  species: z.string().trim().min(1).max(40),
  breed: z.string().trim().min(1).max(80),
  color: z.string().trim().min(1).max(80),
  weightKg: z.number().positive().max(200).optional(),
  sex: z.enum(['MALE', 'FEMALE', 'UNKNOWN']),
  birthDate: z.string().optional().or(z.literal('')),
  ageLabel: z.string().trim().max(40).optional().or(z.literal('')),
})

export const ownerPetRoutes: FastifyPluginAsync = async (app) => {
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
      pets: pets.map((pet) => ({
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
        clinics: pet.clinicAccesses.map((access) => access.clinic),
      })),
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
        avatarUrl: pet.avatarUrl,
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
