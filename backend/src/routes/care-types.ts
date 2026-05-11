import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { createAuditEntry } from '../lib/audit'
import { intervalToDays } from '../lib/dates'
import { requireAuth } from '../lib/auth'

const careCategorySchema = z.enum(['VACCINATION', 'DEWORMING', 'HEARTWORM', 'OTHER'])

const careTypeSchema = z.object({
  name: z.string().trim().min(2).max(80),
  category: careCategorySchema.default('OTHER'),
  defaultIntervalValue: z.coerce.number().int().positive().max(3650),
  defaultIntervalUnit: z.enum(['DAY', 'WEEK', 'MONTH', 'YEAR']),
  isActive: z.boolean().optional(),
})

export const careTypeRoutes: FastifyPluginAsync = async (app) => {
  app.get('/care-types', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const careTypes = await prisma.careType.findMany({
      where: {
        clinicId: request.user.clinicId,
      },
      orderBy: [{ name: 'asc' }],
    })

    return { careTypes }
  })

  app.post('/care-types', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const input = careTypeSchema.parse(request.body)

    const careType = await prisma.$transaction(async (tx) => {
      const created = await tx.careType.create({
        data: {
          clinicId: request.user.clinicId,
          name: input.name,
          category: input.category,
          defaultIntervalValue: input.defaultIntervalValue,
          defaultIntervalUnit: input.defaultIntervalUnit,
          defaultIntervalDays: intervalToDays(input.defaultIntervalValue, input.defaultIntervalUnit),
          isActive: input.isActive ?? true,
        },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'CareType',
        entityId: created.id,
        action: 'CREATE',
        summary: `${created.name} care type created.`,
        nextSnapshot: created,
      })

      return created
    })

    return reply.code(201).send({ careType })
  })

  app.put('/care-types/:careTypeId', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const params = z.object({ careTypeId: z.string().min(1) }).parse(request.params)
    const input = careTypeSchema.parse(request.body)

    const existing = await prisma.careType.findFirst({
      where: { id: params.careTypeId, clinicId: request.user.clinicId },
    })

    if (!existing) {
      return reply.code(404).send({ message: 'Care type not found.' })
    }

    const careType = await prisma.$transaction(async (tx) => {
      const updated = await tx.careType.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          category: input.category,
          defaultIntervalValue: input.defaultIntervalValue,
          defaultIntervalUnit: input.defaultIntervalUnit,
          defaultIntervalDays: intervalToDays(input.defaultIntervalValue, input.defaultIntervalUnit),
          isActive: input.isActive ?? existing.isActive,
        },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'CareType',
        entityId: updated.id,
        action: 'UPDATE',
        summary: `${updated.name} care type updated.`,
        previousSnapshot: existing,
        nextSnapshot: updated,
      })

      return updated
    })

    return { careType }
  })
}
