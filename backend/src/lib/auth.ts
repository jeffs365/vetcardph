import type { FastifyReply, FastifyRequest } from 'fastify'
import bcrypt from 'bcryptjs'
import type { StaffRole } from '@prisma/client'
import { ensureStaffCsrfCookie, verifyStaffAccessCookie, verifyStaffCsrfToken } from './auth-sessions'

export type AuthUser = {
  staffId: string
  clinicId: string
  role: StaffRole
  fullName: string
  email: string
  phone: string | null
  clinicName: string
  clinicPhone: string | null
  clinicAddress: string | null
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthUser | Record<string, unknown>
    user: AuthUser
  }
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    const cookieUser = await verifyStaffAccessCookie(request)
    if (!cookieUser) {
      reply.code(401).send({ message: 'Authentication required.' })
      return false
    }

    ensureStaffCsrfCookie(request, reply)

    if (!verifyStaffCsrfToken(request, reply)) {
      return false
    }

    request.user = cookieUser
    return true
  } catch {
    reply.code(401).send({ message: 'Authentication required.' })
    return false
  }
}

export function requireOwner(user: AuthUser, reply: FastifyReply) {
  if (user.role !== 'OWNER') {
    reply.code(403).send({ message: 'Only clinic owners can perform this action.' })
    return false
  }

  return true
}

export function requireStaffRole(user: AuthUser, reply: FastifyReply, allowedRoles: StaffRole[]) {
  if (!allowedRoles.includes(user.role)) {
    reply.code(403).send({ message: 'Your role cannot perform this action.' })
    return false
  }

  return true
}
