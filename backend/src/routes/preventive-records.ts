import type { Prisma } from '@prisma/client'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { createAuditEntry } from '../lib/audit'
import { addInterval, intervalToDays, parseDateInput, startOfDay } from '../lib/dates'
import { requireAuth } from '../lib/auth'
import { toOwnerSummary, toPreventiveHistoryRecord } from '../lib/serializers'

const intervalUnitSchema = z.enum(['DAY', 'WEEK', 'MONTH', 'YEAR'])
const careCategorySchema = z.enum(['VACCINATION', 'DEWORMING', 'HEARTWORM', 'OTHER'])
const preventiveRecordSourceSchema = z.enum(['CLINIC_RECORDED', 'HISTORICAL_BOOKLET'])

function inferCareCategory(value: string): z.infer<typeof careCategorySchema> {
  const normalized = value.toLowerCase()

  if (/\b(deworm|worm|prazi|pyrantel|anthelmintic)\b/.test(normalized)) {
    return 'DEWORMING'
  }

  if (/\bheartworm\b/.test(normalized)) {
    return 'HEARTWORM'
  }

  if (/\b(vaccine|vaccination|rabies|dhpp|dhlpp|parvo|distemper|lepto|leptospirosis|bordetella|kennel cough|corona|5-in-1|5 in 1)\b/.test(normalized)) {
    return 'VACCINATION'
  }

  return 'OTHER'
}

const preventiveRecordSchema = z
  .object({
    careName: z.string().trim().min(2).max(80),
    category: careCategorySchema.optional(),
    recurrenceKind: z.enum(['ONE_TIME', 'RECURRING']),
    intervalValue: z.coerce.number().int().positive().max(3650).optional(),
    intervalUnit: intervalUnitSchema.optional(),
    administeredOn: z.string().min(1),
    productName: z.string().trim().max(120).optional().or(z.literal('')),
    manufacturer: z.string().trim().max(120).optional().or(z.literal('')),
    lotNumber: z.string().trim().max(80).optional().or(z.literal('')),
    serialNumber: z.string().trim().max(80).optional().or(z.literal('')),
    expiryDate: z.string().optional().or(z.literal('')),
    sourceType: preventiveRecordSourceSchema.optional(),
    sourceNote: z.string().trim().max(240).optional().or(z.literal('')),
    notes: z.string().trim().max(1000).optional().or(z.literal('')),
  })
  .superRefine((input, ctx) => {
    if (input.recurrenceKind !== 'RECURRING') {
      return
    }

    if (typeof input.intervalValue !== 'number') {
      ctx.addIssue({
        code: 'custom',
        message: 'Repeat interval is required.',
        path: ['intervalValue'],
      })
    }

    if (!input.intervalUnit) {
      ctx.addIssue({
        code: 'custom',
        message: 'Repeat frequency is required.',
        path: ['intervalUnit'],
      })
    }
  })

async function resolveCareType(input: {
  tx: Prisma.TransactionClient
  clinicId: string
  name: string
  category: z.infer<typeof careCategorySchema>
  isRecurring: boolean
  intervalValue: number
  intervalUnit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
}) {
  const existing = await input.tx.careType.findFirst({
    where: {
      clinicId: input.clinicId,
      name: input.name,
      isRecurring: input.isRecurring,
      defaultIntervalValue: input.intervalValue,
      defaultIntervalUnit: input.intervalUnit,
    },
  })

  if (existing) {
    if (existing.category === 'OTHER' && input.category !== 'OTHER') {
      return input.tx.careType.update({
        where: { id: existing.id },
        data: {
          category: input.category,
          isActive: true,
        },
      })
    }

    if (existing.isActive) {
      return existing
    }

    return input.tx.careType.update({
      where: { id: existing.id },
      data: { isActive: true },
    })
  }

  return input.tx.careType.create({
    data: {
      clinicId: input.clinicId,
      name: input.name,
      category: input.category,
      isRecurring: input.isRecurring,
      defaultIntervalValue: input.intervalValue,
      defaultIntervalUnit: input.intervalUnit,
      defaultIntervalDays: intervalToDays(input.intervalValue, input.intervalUnit),
      isActive: true,
    },
  })
}

async function syncCurrentClinicSchedule(input: {
  clinicId: string
  petId: string
  careTypeId: string
  tx: Prisma.TransactionClient
}) {
  const latestRecord = await input.tx.preventiveRecord.findFirst({
    where: {
      clinicId: input.clinicId,
      petId: input.petId,
      careTypeId: input.careTypeId,
    },
    orderBy: [{ administeredOn: 'desc' }, { createdAt: 'desc' }],
    include: {
      careType: {
        select: {
          isRecurring: true,
        },
      },
    },
  })

  if (!latestRecord || !latestRecord.careType.isRecurring || !latestRecord.nextDueDate) {
    await input.tx.preventiveSchedule.deleteMany({
      where: {
        clinicId: input.clinicId,
        petId: input.petId,
        careTypeId: input.careTypeId,
      },
    })
    return
  }

  await input.tx.preventiveSchedule.upsert({
    where: {
      clinicId_petId_careTypeId: {
        clinicId: input.clinicId,
        petId: input.petId,
        careTypeId: input.careTypeId,
      },
    },
    update: {
      careTypeId: latestRecord.careTypeId,
      status: 'OPEN',
      nextDueDate: latestRecord.nextDueDate,
      sourceRecordId: latestRecord.id,
      resolvedByRecordId: null,
      resolvedAt: null,
    },
    create: {
      clinicId: input.clinicId,
      petId: input.petId,
      careTypeId: latestRecord.careTypeId,
      status: 'OPEN',
      nextDueDate: latestRecord.nextDueDate,
      sourceRecordId: latestRecord.id,
    },
  })
}

export const preventiveRecordRoutes: FastifyPluginAsync = async (app) => {
  app.get('/pets/:petId/preventive-records', async (request, reply) => {
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
    })

    if (!pet) {
      return reply.code(404).send({ message: 'Pet not found.' })
    }

    const records = await prisma.preventiveRecord.findMany({
      where: {
        petId: pet.id,
        clinicId: request.user.clinicId,
      },
      orderBy: [{ administeredOn: 'desc' }, { createdAt: 'desc' }],
      include: {
        careType: true,
        administeredBy: {
          select: { fullName: true, role: true },
        },
      },
    })

    return {
      records: records.map((record) => toPreventiveHistoryRecord(record, request.user.clinicId)),
    }
  })

  app.post('/pets/:petId/preventive-records', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const params = z.object({ petId: z.string().min(1) }).parse(request.params)
    const input = preventiveRecordSchema.parse(request.body)

    const pet = await prisma.pet.findFirst({
      where: {
        id: params.petId,
        clinicAccesses: {
          some: {
            clinicId: request.user.clinicId,
          },
        },
      },
    })

    if (!pet) {
      return reply.code(404).send({ message: 'Pet not found.' })
    }

    const administeredOn = parseDateInput(input.administeredOn)
    const expiryDate = input.expiryDate ? parseDateInput(input.expiryDate) : null
    const isRecurring = input.recurrenceKind === 'RECURRING'
    const intervalValue = isRecurring ? input.intervalValue! : 0
    const intervalUnit = isRecurring ? input.intervalUnit! : 'DAY'
    const category = input.category ?? inferCareCategory(input.careName)
    const sourceType = input.sourceType ?? 'CLINIC_RECORDED'

    const record = await prisma.$transaction(async (tx) => {
      const careType = await resolveCareType({
        tx,
        clinicId: request.user.clinicId,
        name: input.careName,
        category,
        isRecurring,
        intervalValue,
        intervalUnit,
      })
      const nextDueDate = careType.isRecurring
        ? startOfDay(addInterval(administeredOn, careType.defaultIntervalValue, careType.defaultIntervalUnit))
        : null

      const created = await tx.preventiveRecord.create({
        data: {
          clinicId: request.user.clinicId,
          petId: pet.id,
          careTypeId: careType.id,
          administeredById: request.user.staffId,
          createdById: request.user.staffId,
          administeredOn,
          nextDueDate,
          dueDateOverridden: false,
          productName: input.productName || null,
          manufacturer: input.manufacturer || null,
          lotNumber: input.lotNumber || null,
          serialNumber: input.serialNumber || null,
          expiryDate,
          sourceType,
          sourceNote: input.sourceNote || null,
          notes: input.notes || null,
        },
      })

      await syncCurrentClinicSchedule({
        tx,
        clinicId: request.user.clinicId,
        petId: pet.id,
        careTypeId: careType.id,
      })

      await tx.preventiveSchedule.updateMany({
        where: {
          petId: pet.id,
          careTypeId: careType.id,
          clinicId: {
            not: request.user.clinicId,
          },
          status: 'OPEN',
        },
        data: {
          status: 'COMPLETED_ELSEWHERE',
          resolvedByRecordId: created.id,
          resolvedAt: new Date(),
        },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'PreventiveRecord',
        entityId: created.id,
        action: 'CREATE',
        summary:
          sourceType === 'HISTORICAL_BOOKLET'
            ? `${careType.name} imported from booklet for ${pet.name}.`
            : `${careType.name} recorded for ${pet.name}.`,
        nextSnapshot: created,
      })

      return created
    })

    return reply.code(201).send({ record })
  })

  app.put('/preventive-records/:recordId', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const params = z.object({ recordId: z.string().min(1) }).parse(request.params)
    const input = preventiveRecordSchema.parse(request.body)

    const existing = await prisma.preventiveRecord.findFirst({
      where: { id: params.recordId, clinicId: request.user.clinicId },
    })

    if (!existing) {
      return reply.code(404).send({ message: 'Preventive record not found.' })
    }

    const administeredOn = parseDateInput(input.administeredOn)
    const expiryDate = input.expiryDate ? parseDateInput(input.expiryDate) : null
    const isRecurring = input.recurrenceKind === 'RECURRING'
    const intervalValue = isRecurring ? input.intervalValue! : 0
    const intervalUnit = isRecurring ? input.intervalUnit! : 'DAY'
    const category = input.category ?? inferCareCategory(input.careName)
    const sourceType = input.sourceType ?? 'CLINIC_RECORDED'

    const record = await prisma.$transaction(async (tx) => {
      const careType = await resolveCareType({
        tx,
        clinicId: request.user.clinicId,
        name: input.careName,
        category,
        isRecurring,
        intervalValue,
        intervalUnit,
      })
      const nextDueDate = careType.isRecurring
        ? startOfDay(addInterval(administeredOn, careType.defaultIntervalValue, careType.defaultIntervalUnit))
        : null

      const updated = await tx.preventiveRecord.update({
        where: { id: existing.id },
        data: {
          careTypeId: careType.id,
          administeredById: request.user.staffId,
          administeredOn,
          nextDueDate,
          dueDateOverridden: false,
          productName: input.productName || null,
          manufacturer: input.manufacturer || null,
          lotNumber: input.lotNumber || null,
          serialNumber: input.serialNumber || null,
          expiryDate,
          sourceType,
          sourceNote: input.sourceNote || null,
          notes: input.notes || null,
        },
      })

      await syncCurrentClinicSchedule({
        tx,
        clinicId: request.user.clinicId,
        petId: updated.petId,
        careTypeId: careType.id,
      })

      if (existing.careTypeId !== careType.id) {
        await syncCurrentClinicSchedule({
          tx,
          clinicId: request.user.clinicId,
          petId: updated.petId,
          careTypeId: existing.careTypeId,
        })
      }

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'PreventiveRecord',
        entityId: updated.id,
        action: 'UPDATE',
        summary: 'Preventive record updated.',
        previousSnapshot: existing,
        nextSnapshot: updated,
      })

      return updated
    })

    return { record }
  })

  app.delete('/preventive-records/:recordId', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const params = z.object({ recordId: z.string().min(1) }).parse(request.params)

    const existing = await prisma.preventiveRecord.findFirst({
      where: { id: params.recordId, clinicId: request.user.clinicId },
      include: {
        careType: { select: { name: true } },
        pet: { select: { name: true } },
      },
    })

    if (!existing) {
      return reply.code(404).send({ message: 'Preventive record not found.' })
    }

    await prisma.$transaction(async (tx) => {
      await tx.preventiveRecord.delete({ where: { id: existing.id } })

      await syncCurrentClinicSchedule({
        tx,
        clinicId: request.user.clinicId,
        petId: existing.petId,
        careTypeId: existing.careTypeId,
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'PreventiveRecord',
        entityId: existing.id,
        action: 'DELETE',
        summary: `${existing.careType.name} deleted for ${existing.pet.name}.`,
        previousSnapshot: existing,
      })
    })

    return reply.code(204).send()
  })

  app.get('/due-records', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const query = z
      .object({
        status: z.enum(['all', 'overdue', 'dueSoon']).default('all'),
      })
      .parse(request.query)

    const today = startOfDay(new Date())
    const dueSoonLimit = addInterval(today, 7, 'DAY')

    const records = await prisma.preventiveSchedule.findMany({
      where: {
        clinicId: request.user.clinicId,
        status: 'OPEN',
        nextDueDate: {
          lte: dueSoonLimit,
        },
      },
      orderBy: { nextDueDate: 'asc' },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            species: true,
            owner: {
              select: {
                id: true,
                fullName: true,
                mobile: true,
                address: true,
                email: true,
              },
            },
          },
        },
        careType: {
          select: {
            name: true,
            category: true,
            defaultIntervalValue: true,
            defaultIntervalUnit: true,
            defaultIntervalDays: true,
          },
        },
      },
    })

    const filtered = records.filter((record) => {
      if (query.status === 'all') {
        return true
      }

      if (query.status === 'overdue') {
        return record.nextDueDate < today
      }

      return record.nextDueDate >= today
    })

    return {
      records: filtered.map((record) => ({
        id: record.id,
        nextDueDate: record.nextDueDate,
        pet: {
          ...record.pet,
          owner: toOwnerSummary(record.pet.owner),
        },
        careType: record.careType,
      })),
    }
  })
}
