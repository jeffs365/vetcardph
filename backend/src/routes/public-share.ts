import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import {
  toOwnerSummary,
  toPetAllergy,
  toPetDietNote,
  toPetMedication,
  toPreventiveHistoryRecord,
  toVisitHistoryRecord,
} from '../lib/serializers'

function resolveShareState(input: { revokedAt: Date | null; expiresAt: Date | null }) {
  if (input.revokedAt) {
    return { ok: false as const, message: 'This share link has been revoked.' }
  }

  if (input.expiresAt && input.expiresAt.getTime() <= Date.now()) {
    return { ok: false as const, message: 'This share link has expired.' }
  }

  return { ok: true as const }
}

export const publicShareRoutes: FastifyPluginAsync = async (app) => {
  app.get('/share/:publicToken', async (request, reply) => {
    const params = z.object({ publicToken: z.string().min(1) }).parse(request.params)

    const token = await prisma.shareToken.findUnique({
      where: {
        publicToken: params.publicToken,
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
        pet: {
          include: {
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
              where: {
                status: 'SCHEDULED',
              },
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
        },
      },
    })

    if (!token) {
      return reply.code(404).send({ message: 'Share link not found.' })
    }

    const shareState = resolveShareState(token)
    if (!shareState.ok) {
      return reply.code(410).send({ message: shareState.message })
    }

    await prisma.shareToken.update({
      where: { id: token.id },
      data: {
        lastViewedAt: new Date(),
        viewCount: {
          increment: 1,
        },
      },
    })

    if (token.type === 'EMERGENCY') {
      return {
        share: {
          type: token.type,
          expiresAt: token.expiresAt,
          pet: {
            id: token.pet.id,
            name: token.pet.name,
            avatarUrl: token.pet.avatarUrl,
            species: token.pet.species,
            breed: token.pet.breed,
            color: token.pet.color,
            weightKg: token.pet.weightKg,
            sex: token.pet.sex,
            birthDate: token.pet.birthDate,
            ageLabel: token.pet.ageLabel,
            allergies: token.pet.allergies.map((allergy) => toPetAllergy(allergy)),
            medications: token.pet.medications.map((medication) => toPetMedication(medication)),
            dietNotes: token.pet.dietNotes.map((dietNote) => toPetDietNote(dietNote)),
          },
          emergencyContact: {
            fullName: token.owner.fullName,
            mobile: token.owner.mobile,
          },
          linkedClinics: token.pet.clinicAccesses.map((access) => access.clinic),
        },
      }
    }

    return {
      share: {
        type: token.type,
        expiresAt: token.expiresAt,
        pet: {
          id: token.pet.id,
          name: token.pet.name,
          avatarUrl: token.pet.avatarUrl,
          species: token.pet.species,
          breed: token.pet.breed,
          color: token.pet.color,
          weightKg: token.pet.weightKg,
          sex: token.pet.sex,
          birthDate: token.pet.birthDate,
          ageLabel: token.pet.ageLabel,
          owner: toOwnerSummary(token.owner),
          clinics: token.pet.clinicAccesses.map((access) => access.clinic),
          visits: token.pet.visits.map((visit) => ({
            ...toVisitHistoryRecord(visit, visit.clinicId),
            clinicName: visit.clinic.name,
          })),
          appointments: token.pet.appointments.map((appointment) => ({
            ...appointment,
            clinic: appointment.clinic,
          })),
          preventiveRecords: token.pet.preventiveRecords.map((record) => ({
            ...toPreventiveHistoryRecord(record, record.clinicId),
            clinicName: record.clinic.name,
          })),
          allergies: token.pet.allergies.map((allergy) => toPetAllergy(allergy)),
          medications: token.pet.medications.map((medication) => toPetMedication(medication)),
          dietNotes: token.pet.dietNotes.map((dietNote) => toPetDietNote(dietNote)),
        },
      },
    }
  })
}
