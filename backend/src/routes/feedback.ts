import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { createAuditEntry } from '../lib/audit'
import { requireAuth } from '../lib/auth'

const feedbackCategorySchema = z.enum(['BUG', 'IDEA', 'FEATURE_REQUEST', 'GENERAL'])

const createFeedbackSchema = z.object({
  category: feedbackCategorySchema,
  message: z.string().trim().min(10).max(2000),
})

const listFeedbackQuerySchema = z.object({
  mine: z.coerce.boolean().default(true),
  limit: z.coerce.number().int().min(1).max(20).default(5),
})

export const feedbackRoutes: FastifyPluginAsync = async (app) => {
  app.get('/feedback', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const query = listFeedbackQuerySchema.parse(request.query)

    const feedback = await prisma.feedbackSubmission.findMany({
      where: {
        clinicId: request.user.clinicId,
        staffId: query.mine ? request.user.staffId : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      include: {
        staff: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
    })

    return { feedback }
  })

  app.post('/feedback', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const input = createFeedbackSchema.parse(request.body)

    const feedback = await prisma.$transaction(async (tx) => {
      const created = await tx.feedbackSubmission.create({
        data: {
          clinicId: request.user.clinicId,
          staffId: request.user.staffId,
          category: input.category,
          message: input.message,
        },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'FeedbackSubmission',
        entityId: created.id,
        action: 'CREATE',
        summary: `Feedback submitted: ${input.category}.`,
        nextSnapshot: {
          category: created.category,
          message: created.message,
        },
      })

      return created
    })

    return reply.code(201).send({ feedback })
  })
}
