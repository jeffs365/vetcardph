import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { env } from '../env'
import {
  clearOwnerAuthCookies,
  createOwnerAuthSession,
  revokeOwnerAuthSession,
  rotateOwnerAuthSession,
  verifyOwnerCsrfToken,
} from '../lib/auth-sessions'
import { issueOwnerOtpCode, verifyOwnerOtpCode } from '../lib/owner-otp'
import { requireOwnerSession, toOwnerSessionUser } from '../lib/owner-session'
import { normalizePhilippineMobile } from '../lib/phones'

const requestCodeSchema = z.object({
  phone: z.string().trim().min(7).max(40),
})

const verifyCodeSchema = z.object({
  phone: z.string().trim().min(7).max(40),
  code: z.string().trim().length(6),
})

const registerOwnerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(40),
})

const updateOwnerSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal('')),
  address: z.string().trim().max(300).optional(),
})

export const ownerAuthRoutes: FastifyPluginAsync = async (app) => {
  app.post('/request-code', async (request, reply) => {
    const input = requestCodeSchema.parse(request.body)
    const normalizedPhone = normalizePhilippineMobile(input.phone)

    const owner = await prisma.owner.findUnique({
      where: { mobile: normalizedPhone },
      select: {
        id: true,
      },
    })

    if (!owner) {
      return reply.code(404).send({
        message: 'No VetCard pet record was found for that phone number yet.',
      })
    }

    const otp = await issueOwnerOtpCode(normalizedPhone)

    if (otp.rateLimited) {
      return reply.code(429).send({
        message: 'Too many code requests. Please wait 15 minutes before trying again.',
      })
    }

    return {
      success: true,
      expiresInSeconds: otp.expiresInSeconds,
      ...(env.NODE_ENV === 'development' ? { devCode: otp.code } : {}),
    }
  })

  app.post('/register', async (request, reply) => {
    const input = registerOwnerSchema.parse(request.body)
    const normalizedPhone = normalizePhilippineMobile(input.phone)

    const existingOwner = await prisma.owner.findUnique({
      where: { mobile: normalizedPhone },
      select: {
        id: true,
      },
    })

    if (existingOwner) {
      return reply.code(409).send({
        message: 'That phone already has a VetCard record. Sign in with a one-time code instead.',
      })
    }

    await prisma.owner.create({
      data: {
        fullName: input.fullName,
        mobile: normalizedPhone,
        address: '',
      },
    })

    const otp = await issueOwnerOtpCode(normalizedPhone)

    if (otp.rateLimited) {
      return reply.code(429).send({
        message: 'Too many code requests. Please wait 15 minutes before trying again.',
      })
    }

    return {
      success: true,
      expiresInSeconds: otp.expiresInSeconds,
      ...(env.NODE_ENV === 'development' ? { devCode: otp.code } : {}),
    }
  })

  app.post('/verify-code', async (request, reply) => {
    const input = verifyCodeSchema.parse(request.body)
    const normalizedPhone = normalizePhilippineMobile(input.phone)

    const isValid = await verifyOwnerOtpCode(normalizedPhone, input.code)
    if (!isValid) {
      return reply.code(401).send({
        message: 'That verification code is invalid or expired.',
      })
    }

    const owner = await prisma.owner.findUnique({
      where: { mobile: normalizedPhone },
    })

    if (!owner) {
      return reply.code(404).send({
        message: 'No VetCard pet record was found for that phone number yet.',
      })
    }

    const claimedOwner =
      owner.claimedAt !== null
        ? owner
        : await prisma.owner.update({
            where: { id: owner.id },
            data: {
              claimedAt: new Date(),
            },
          })

    const user = toOwnerSessionUser(claimedOwner)
    await createOwnerAuthSession(user, request, reply)

    return {
      user,
    }
  })

  app.post('/refresh', async (request, reply) => {
    const user = await rotateOwnerAuthSession(request, reply)
    if (!user) {
      clearOwnerAuthCookies(reply)
      return reply.code(401).send({ message: 'Owner authentication required.' })
    }

    return { user }
  })

  app.post('/logout', async (request, reply) => {
    if (!verifyOwnerCsrfToken(request, reply)) {
      return
    }

    await revokeOwnerAuthSession(request)
    clearOwnerAuthCookies(reply)
    return { success: true }
  })

  app.get('/me', async (request, reply) => {
    const session = await requireOwnerSession(request, reply)
    if (!session) {
      return
    }

    const owner = await prisma.owner.findUnique({
      where: { id: session.ownerId },
    })

    if (!owner) {
      return reply.code(404).send({ message: 'Owner account not found.' })
    }

    return {
      user: toOwnerSessionUser(owner),
    }
  })

  app.patch('/me', async (request, reply) => {
    const session = await requireOwnerSession(request, reply)
    if (!session) {
      return
    }

    const input = updateOwnerSchema.parse(request.body)

    const owner = await prisma.owner.update({
      where: { id: session.ownerId },
      data: {
        ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        ...(input.email !== undefined ? { email: input.email || null } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
      },
    })

    return { user: toOwnerSessionUser(owner) }
  })
}
