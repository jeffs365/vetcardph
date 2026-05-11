import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { ensureOwnerCsrfCookie, verifyOwnerAccessCookie, verifyOwnerCsrfToken } from './auth-sessions'

const ownerSessionSchema = z.object({
  kind: z.literal('owner'),
  ownerId: z.string().min(1),
  fullName: z.string().min(1),
  mobile: z.string().min(1),
  email: z.string().email().nullable(),
  address: z.string().nullable().default(null),
  claimedAt: z.string().nullable(),
})

export type OwnerSessionUser = z.infer<typeof ownerSessionSchema>

export function toOwnerSessionUser(input: {
  id: string
  fullName: string
  mobile: string
  email: string | null
  address: string
  claimedAt: Date | null
}): OwnerSessionUser {
  return {
    kind: 'owner',
    ownerId: input.id,
    fullName: input.fullName,
    mobile: input.mobile,
    email: input.email,
    address: input.address,
    claimedAt: input.claimedAt ? input.claimedAt.toISOString() : null,
  }
}

export async function requireOwnerSession(request: FastifyRequest, reply: FastifyReply) {
  try {
    const cookieSession = await verifyOwnerAccessCookie(request)
    if (cookieSession) {
      ensureOwnerCsrfCookie(request, reply)

      if (!verifyOwnerCsrfToken(request, reply)) {
        return null
      }

      return cookieSession
    }
  } catch {
    reply.code(401).send({ message: 'Owner authentication required.' })
    return null
  }

  reply.code(401).send({ message: 'Owner authentication required.' })
  return null
}
