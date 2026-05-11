import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { FastifyPluginAsync } from 'fastify'
import sharp from 'sharp'
import { z } from 'zod'
import { prisma } from '../db'
import { createAuditEntry } from '../lib/audit'
import { parseDateInput } from '../lib/dates'
import { requireAuth } from '../lib/auth'
import { normalizePhilippineMobile, normalizePhilippineMobileSearch } from '../lib/phones'
import {
  toAccessSummary,
  toOwnerSummary,
  toPetAllergy,
  toPetDietNote,
  toPetListItem,
  toPetMedication,
  toPreventiveHistoryRecord,
  toVisitHistoryRecord,
} from '../lib/serializers'

const petAvatarDir = path.resolve(__dirname, '../../../uploads/pets/avatar')

async function ensurePetAvatarDir() {
  await fs.mkdir(petAvatarDir, { recursive: true })
}

function createAvatarFilename(clinicId: string) {
  return `${clinicId}-${Date.now()}-${crypto.randomUUID()}.webp`
}

async function deleteStoredAvatar(avatarUrl: string | null | undefined) {
  if (!avatarUrl) {
    return
  }

  const filename = path.basename(avatarUrl)
  if (!filename) {
    return
  }

  await fs.rm(path.join(petAvatarDir, filename), { force: true })
}

function getAgeInMonthsFromDate(value: Date | null | undefined) {
  if (!value) {
    return null
  }

  const today = new Date()
  let months = (today.getFullYear() - value.getFullYear()) * 12 + (today.getMonth() - value.getMonth())

  if (today.getDate() < value.getDate()) {
    months -= 1
  }

  return months >= 0 ? months : null
}

function getAgeInMonthsFromLabel(value: string | null | undefined) {
  if (!value?.trim()) {
    return null
  }

  const normalized = value.trim().toLowerCase()
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(year|yr|y|month|mo|m|week|wk|w)/)
  if (!match) {
    return null
  }

  const amount = Number.parseFloat(match[1] ?? '')
  if (!Number.isFinite(amount)) {
    return null
  }

  const unit = match[2]
  if (unit === 'year' || unit === 'yr' || unit === 'y') {
    return Math.round(amount * 12)
  }

  if (unit === 'week' || unit === 'wk' || unit === 'w') {
    return Math.max(0, Math.round(amount / 4.345))
  }

  return Math.round(amount)
}

function getAgeBucket(birthDate: Date | null | undefined, ageLabel: string | null | undefined) {
  const months = getAgeInMonthsFromDate(birthDate) ?? getAgeInMonthsFromLabel(ageLabel)

  if (months === null) {
    return 'unknown'
  }

  if (months < 12) {
    return 'under-1'
  }

  if (months < 48) {
    return '1-3'
  }

  if (months < 96) {
    return '4-7'
  }

  return '8-plus'
}

const petSchema = z.object({
  petName: z.string().trim().min(1).max(80),
  avatarUrl: z.string().trim().startsWith('/uploads/pets/avatar/').max(255).optional().or(z.literal('')),
  species: z.string().trim().min(1).max(40),
  breed: z.string().trim().min(1).max(80),
  color: z.string().trim().min(1).max(80),
  weightKg: z.number().positive().max(200).optional(),
  sex: z.enum(['MALE', 'FEMALE', 'UNKNOWN']),
  birthDate: z.string().optional().or(z.literal('')),
  ageLabel: z.string().trim().max(40).optional().or(z.literal('')),
  ownerName: z.string().trim().min(1).max(120),
  ownerMobile: z.string().trim().min(7).max(40),
  ownerAddress: z.string().trim().min(3).max(200),
  ownerEmail: z.string().trim().email().optional().or(z.literal('')),
})

const linkCandidateQuerySchema = z.object({
  ownerMobile: z.string().trim().min(7).max(40),
})

const linkPetSchema = z.object({
  ownerMobile: z.string().trim().min(7).max(40),
  confirmOwnerAccess: z.boolean(),
})

export const petRoutes: FastifyPluginAsync = async (app) => {
  app.post('/pets/avatar/upload', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
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

    await ensurePetAvatarDir()
    const filename = createAvatarFilename(request.user.clinicId)
    const outputPath = path.join(petAvatarDir, filename)

    try {
      await sharp(buffer)
        .rotate()
        .resize(512, 512, { fit: 'cover', position: 'centre' })
        .webp({ quality: 82 })
        .toFile(outputPath)
    } catch {
      return reply.code(400).send({ message: 'Could not process that image file.' })
    }

    return reply.code(201).send({
      avatarUrl: `/uploads/pets/avatar/${filename}`,
    })
  })

  app.get('/pets', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const query = z
      .object({
        q: z.string().trim().optional(),
        species: z.string().trim().optional(),
        breed: z.string().trim().optional(),
        color: z.string().trim().optional(),
        sex: z.enum(['MALE', 'FEMALE', 'UNKNOWN']).optional(),
        age: z.enum(['under-1', '1-3', '4-7', '8-plus', 'unknown']).optional(),
      })
      .parse(request.query)

    const normalizedPhoneQuery = query.q ? normalizePhilippineMobileSearch(query.q) : null

    const pets = await prisma.pet.findMany({
      where: {
        clinicAccesses: {
          some: {
            clinicId: request.user.clinicId,
          },
        },
        ...(query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: 'insensitive' } },
                {
                  owner: {
                    fullName: {
                      contains: query.q,
                      mode: 'insensitive',
                    },
                  },
                },
                {
                  owner: {
                    mobile: {
                      contains: normalizedPhoneQuery ?? query.q,
                    },
                  },
                },
              ],
            }
          : {}),
        ...(query.species
          ? {
              species: {
                equals: query.species,
                mode: 'insensitive',
              },
            }
          : {}),
        ...(query.breed
          ? {
              breed: {
                equals: query.breed,
                mode: 'insensitive',
              },
            }
          : {}),
        ...(query.color
          ? {
              color: {
                equals: query.color,
                mode: 'insensitive',
              },
            }
          : {}),
        ...(query.sex ? { sex: query.sex } : {}),
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
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
      take: query.age ? 250 : query.q ? 100 : 200,
    })

    const filteredPets = query.age ? pets.filter((pet) => getAgeBucket(pet.birthDate, pet.ageLabel) === query.age) : pets

    return {
      pets: filteredPets.map((pet) => toPetListItem(pet)),
    }
  })

  app.get('/pets/metadata', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const rows = await prisma.pet.findMany({
      where: {
        clinicAccesses: {
          some: { clinicId: request.user.clinicId },
        },
      },
      select: { species: true, breed: true, color: true },
    })

    const unique = <T>(arr: T[]): T[] => [...new Set(arr)].sort() as T[]

    return {
      species: unique(rows.map((r) => r.species).filter(Boolean)),
      breed: unique(rows.map((r) => r.breed).filter(Boolean)),
      color: unique(rows.map((r) => r.color).filter(Boolean)),
    }
  })

  app.get('/pets/link-candidates', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const query = linkCandidateQuerySchema.parse(request.query)
    const normalizedOwnerMobile = normalizePhilippineMobile(query.ownerMobile)

    const owner = await prisma.owner.findUnique({
      where: { mobile: normalizedOwnerMobile },
      select: {
        id: true,
        fullName: true,
        mobile: true,
        address: true,
        email: true,
      },
    })

    if (!owner) {
      return {
        owner: null,
        pets: [],
      }
    }

    const pets = await prisma.pet.findMany({
      where: {
        ownerId: owner.id,
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
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
    })

    return {
      owner: toOwnerSummary(owner),
      pets: pets.map((pet) => ({
        ...toPetListItem(pet),
        linkedToCurrentClinic: pet.clinicAccesses.some((access) => access.clinicId === request.user.clinicId),
      })),
    }
  })

  app.post('/pets', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const input = petSchema.parse(request.body)
    const normalizedOwnerMobile = normalizePhilippineMobile(input.ownerMobile)
    const birthDate = input.birthDate ? parseDateInput(input.birthDate) : null

    const result = await prisma.$transaction(async (tx) => {
      const existingOwner = await tx.owner.findUnique({ where: { mobile: normalizedOwnerMobile } })
      const existingOwnerAccess = existingOwner
        ? await tx.clinicPetAccess.findFirst({
            where: {
              clinicId: request.user.clinicId,
              pet: {
                ownerId: existingOwner.id,
              },
            },
            select: { id: true },
          })
        : null

      const owner = existingOwner
        ? existingOwner.claimedAt !== null
          ? existingOwner
          : existingOwnerAccess
            ? await tx.owner.update({
                where: { id: existingOwner.id },
                data: {
                  fullName: input.ownerName,
                  address: input.ownerAddress,
                  email: input.ownerEmail || null,
                },
              })
            : existingOwner
        : await tx.owner.create({
            data: {
              fullName: input.ownerName,
              mobile: normalizedOwnerMobile,
              address: input.ownerAddress,
              email: input.ownerEmail || null,
            },
          })

      const matchedPet = await tx.pet.findFirst({
        where: {
          ownerId: owner.id,
          name: {
            equals: input.petName,
            mode: 'insensitive',
          },
          species: {
            equals: input.species,
            mode: 'insensitive',
          },
          sex: input.sex,
          birthDate: birthDate ?? undefined,
        },
      })

      if (matchedPet) {
        const existingAccess = await tx.clinicPetAccess.findUnique({
          where: {
            clinicId_petId: {
              clinicId: request.user.clinicId,
              petId: matchedPet.id,
            },
          },
        })

        if (existingAccess) {
          return {
            kind: 'duplicate-existing' as const,
            petId: matchedPet.id,
          }
        }

        return {
          kind: 'link-required' as const,
          petId: matchedPet.id,
        }
      }

      const created = await tx.pet.create({
        data: {
          ownerId: owner.id,
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
      })

      await tx.clinicPetAccess.create({
        data: {
          clinicId: request.user.clinicId,
          petId: created.id,
        },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'Pet',
        entityId: created.id,
        action: 'CREATE',
        summary: `${created.name} pet profile created.`,
        nextSnapshot: created,
      })

      return {
        kind: 'created' as const,
        petId: created.id,
      }
    })

    if (result.kind === 'duplicate-existing') {
      return reply.code(409).send({
        message: 'A matching pet profile already exists in this clinic workspace.',
      })
    }

    if (result.kind === 'link-required') {
      return reply.code(409).send({
        message: 'A matching pet profile already exists for this owner. Use Link Pet Profile instead.',
      })
    }

    return reply.code(201).send({
      pet: { id: result.petId },
      linkedExistingPet: false,
    })
  })

  app.post('/pets/:petId/link', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const params = z.object({ petId: z.string().min(1) }).parse(request.params)
    const input = linkPetSchema.parse(request.body)
    const normalizedOwnerMobile = normalizePhilippineMobile(input.ownerMobile)

    if (!input.confirmOwnerAccess) {
      return reply.code(400).send({
        message: 'Owner confirmation is required to link a shared pet record.',
      })
    }

    const pet = await prisma.pet.findUnique({
      where: { id: params.petId },
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
          },
        },
        },
    })

    if (!pet) {
      return reply.code(404).send({ message: 'Pet not found.' })
    }

    if (pet.owner.mobile !== normalizedOwnerMobile) {
      return reply.code(400).send({
        message: 'Selected pet does not match that owner phone number.',
      })
    }

    const alreadyLinked = pet.clinicAccesses.some((access) => access.clinicId === request.user.clinicId)
    if (alreadyLinked) {
      return {
        pet: { id: pet.id },
        alreadyLinked: true,
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.clinicPetAccess.create({
        data: {
          clinicId: request.user.clinicId,
          petId: pet.id,
        },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'ClinicPetAccess',
        entityId: pet.id,
        action: 'CREATE',
        summary: `${pet.name} linked into this clinic workspace.`,
      })
    })

    return reply.code(201).send({
      pet: { id: pet.id },
      alreadyLinked: false,
    })
  })

  app.get('/pets/:petId', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const params = z.object({ petId: z.string().min(1) }).parse(request.params)

    const pet = await prisma.pet.findFirst({
      where: {
        id: params.petId,
        clinicAccesses: {
          some: {
            clinicId: request.user.clinicId,
          },
        },
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
          },
        },
        visits: {
          orderBy: [{ visitDate: 'desc' }, { createdAt: 'desc' }],
          include: {
            attendedBy: { select: { id: true, fullName: true, role: true } },
          },
        },
        appointments: {
          where: {
            clinicId: request.user.clinicId,
          },
          orderBy: { scheduledFor: 'desc' },
          include: {
            createdBy: {
              select: {
                fullName: true,
                role: true,
              },
            },
          },
        },
        preventiveRecords: {
          orderBy: [{ administeredOn: 'desc' }, { createdAt: 'desc' }],
          include: {
            careType: true,
            administeredBy: { select: { fullName: true, role: true } },
          },
        },
        allergies: {
          orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
          include: {
            clinic: { select: { name: true } },
          },
        },
        medications: {
          orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
          include: {
            clinic: { select: { name: true } },
          },
        },
        dietNotes: {
          orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
          include: {
            clinic: { select: { name: true } },
          },
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
          currentClinicId: request.user.clinicId,
          visits: pet.visits,
          preventiveRecords: pet.preventiveRecords,
        }),
        visits: pet.visits.map((visit) => toVisitHistoryRecord(visit, request.user.clinicId)),
        appointments: pet.appointments,
        preventiveRecords: pet.preventiveRecords.map((record) =>
          toPreventiveHistoryRecord(record, request.user.clinicId),
        ),
        allergies: pet.allergies.map((allergy) => toPetAllergy(allergy, request.user.clinicId)),
        medications: pet.medications.map((medication) =>
          toPetMedication(medication, request.user.clinicId),
        ),
        dietNotes: pet.dietNotes.map((dietNote) => toPetDietNote(dietNote, request.user.clinicId)),
      },
    }
  })

  app.put('/pets/:petId', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const params = z.object({ petId: z.string().min(1) }).parse(request.params)
    const input = petSchema.parse(request.body)
    const normalizedOwnerMobile = normalizePhilippineMobile(input.ownerMobile)

    const existing = await prisma.pet.findFirst({
      where: {
        id: params.petId,
        clinicAccesses: {
          some: {
            clinicId: request.user.clinicId,
          },
        },
      },
      include: { owner: true },
    })

    if (!existing) {
      return reply.code(404).send({ message: 'Pet not found.' })
    }

    const birthDate = input.birthDate ? parseDateInput(input.birthDate) : null
    const previousAvatarUrl = existing.avatarUrl
    const nextAvatarUrl = input.avatarUrl === '' ? null : input.avatarUrl ?? existing.avatarUrl

    const pet = await prisma.$transaction(async (tx) => {
      const existingOwner = await tx.owner.findUnique({ where: { mobile: normalizedOwnerMobile } })

      const owner = existingOwner
        ? existingOwner.claimedAt !== null
          ? existingOwner
          : await tx.owner.update({
              where: { id: existingOwner.id },
              data: {
                fullName: input.ownerName,
                address: input.ownerAddress,
                email: input.ownerEmail || null,
              },
            })
        : await tx.owner.create({
            data: {
              fullName: input.ownerName,
              mobile: normalizedOwnerMobile,
              address: input.ownerAddress,
              email: input.ownerEmail || null,
            },
          })

      const updated = await tx.pet.update({
        where: { id: existing.id },
        data: {
          ownerId: owner.id,
          name: input.petName,
          avatarUrl: nextAvatarUrl,
          species: input.species,
          breed: input.breed,
          color: input.color,
          weightKg: input.weightKg ?? null,
          sex: input.sex,
          birthDate,
          ageLabel: input.ageLabel || null,
        },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'Pet',
        entityId: updated.id,
        action: 'UPDATE',
        summary: 'Pet profile updated.',
        previousSnapshot: existing,
        nextSnapshot: updated,
      })

      return updated
    })

    if (previousAvatarUrl && previousAvatarUrl !== nextAvatarUrl) {
      await deleteStoredAvatar(previousAvatarUrl)
    }

    return { pet }
  })

  app.delete('/pets/:petId', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const { petId } = z.object({ petId: z.string().min(1) }).parse(request.params)

    const access = await prisma.clinicPetAccess.findUnique({
      where: { clinicId_petId: { clinicId: request.user.clinicId, petId } },
    })

    if (!access) {
      return reply.code(404).send({ message: 'Pet not found.' })
    }

    await prisma.$transaction(async (tx) => {
      await tx.clinicPetAccess.delete({
        where: { clinicId_petId: { clinicId: request.user.clinicId, petId } },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'Pet',
        entityId: petId,
        action: 'DELETE',
        summary: 'Pet removed from clinic.',
      })
    })

    return reply.code(204).send()
  })
}
