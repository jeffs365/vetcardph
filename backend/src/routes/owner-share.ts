import crypto from 'node:crypto'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { resolvePetAvatarUrl } from '../lib/pet-avatars'
import { requireOwnerSession } from '../lib/owner-session'

const createShareTokenSchema = z.object({
  petId: z.string().min(1),
  type: z.enum(['EMERGENCY', 'FULL_PROFILE']),
  expiresInMinutes: z.coerce.number().int().positive().max(24 * 60).optional(),
})

const shareTokenParamsSchema = z.object({
  shareTokenId: z.string().min(1),
})

function createPublicToken() {
  return crypto.randomBytes(18).toString('base64url')
}

function isShareActive(input: { revokedAt: Date | null; expiresAt: Date | null }) {
  if (input.revokedAt) {
    return false
  }

  if (!input.expiresAt) {
    return true
  }

  return input.expiresAt.getTime() > Date.now()
}

export const ownerShareRoutes: FastifyPluginAsync = async (app) => {
  app.get('/share-tokens', async (request, reply) => {
    const session = await requireOwnerSession(request, reply)
    if (!session) {
      return
    }

    const query = z
      .object({
        petId: z.string().min(1).optional(),
      })
      .parse(request.query)

    const tokens = await prisma.shareToken.findMany({
      where: {
        ownerId: session.ownerId,
        petId: query.petId,
      },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    })

    return {
      tokens: await Promise.all(
        tokens.map(async (token) => ({
          id: token.id,
          petId: token.petId,
          type: token.type,
          publicToken: token.publicToken,
          expiresAt: token.expiresAt,
          revokedAt: token.revokedAt,
          lastViewedAt: token.lastViewedAt,
          viewCount: token.viewCount,
          createdAt: token.createdAt,
          isActive: isShareActive(token),
          pet: {
            ...token.pet,
            avatarUrl: await resolvePetAvatarUrl(token.pet.avatarUrl),
          },
        })),
      ),
    }
  })

  app.post('/share-tokens', async (request, reply) => {
    const session = await requireOwnerSession(request, reply)
    if (!session) {
      return
    }

    const input = createShareTokenSchema.parse(request.body)

    const pet = await prisma.pet.findFirst({
      where: {
        id: input.petId,
        ownerId: session.ownerId,
      },
      select: {
        id: true,
        name: true,
        ownerId: true,
      },
    })

    if (!pet) {
      return reply.code(404).send({ message: 'Pet not found.' })
    }

    if (input.type === 'EMERGENCY') {
      const existing = await prisma.shareToken.findFirst({
        where: {
          ownerId: session.ownerId,
          petId: pet.id,
          type: 'EMERGENCY',
          revokedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      })

      if (existing) {
        return reply.code(200).send({
          token: {
            id: existing.id,
            petId: existing.petId,
            type: existing.type,
            publicToken: existing.publicToken,
            expiresAt: existing.expiresAt,
            revokedAt: existing.revokedAt,
            lastViewedAt: existing.lastViewedAt,
            viewCount: existing.viewCount,
            createdAt: existing.createdAt,
            isActive: isShareActive(existing),
          },
        })
      }
    }

    const expiresAt =
      input.type === 'FULL_PROFILE'
        ? new Date(Date.now() + (input.expiresInMinutes ?? 60) * 60 * 1000)
        : null

    const token = await prisma.shareToken.create({
      data: {
        ownerId: session.ownerId,
        petId: pet.id,
        type: input.type,
        publicToken: createPublicToken(),
        expiresAt,
      },
    })

    return reply.code(201).send({
      token: {
        id: token.id,
        petId: token.petId,
        type: token.type,
        publicToken: token.publicToken,
        expiresAt: token.expiresAt,
        revokedAt: token.revokedAt,
        lastViewedAt: token.lastViewedAt,
        viewCount: token.viewCount,
        createdAt: token.createdAt,
        isActive: isShareActive(token),
      },
    })
  })

  app.post('/share-tokens/:shareTokenId/revoke', async (request, reply) => {
    const session = await requireOwnerSession(request, reply)
    if (!session) {
      return
    }

    const params = shareTokenParamsSchema.parse(request.params)

    const existing = await prisma.shareToken.findFirst({
      where: {
        id: params.shareTokenId,
        ownerId: session.ownerId,
      },
    })

    if (!existing) {
      return reply.code(404).send({ message: 'Share token not found.' })
    }

    const token =
      existing.revokedAt !== null
        ? existing
        : await prisma.shareToken.update({
            where: {
              id: existing.id,
            },
            data: {
              revokedAt: new Date(),
            },
          })

    return {
      token: {
        id: token.id,
        petId: token.petId,
        type: token.type,
        publicToken: token.publicToken,
        expiresAt: token.expiresAt,
        revokedAt: token.revokedAt,
        lastViewedAt: token.lastViewedAt,
        viewCount: token.viewCount,
        createdAt: token.createdAt,
        isActive: isShareActive(token),
      },
    }
  })
}
