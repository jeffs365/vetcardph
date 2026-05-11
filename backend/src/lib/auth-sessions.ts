import crypto from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { env } from '../env'
import type { AuthUser } from './auth'
import type { OwnerSessionUser } from './owner-session'
import { toSessionUser } from './serializers'

const staffAccessCookie = 'vc_staff_access'
const staffRefreshCookie = 'vc_staff_refresh'
const staffCsrfCookie = 'vc_staff_csrf'
const ownerAccessCookie = 'vc_owner_access'
const ownerRefreshCookie = 'vc_owner_refresh'
const ownerCsrfCookie = 'vc_owner_csrf'

const staffAccessSchema = z.object({
  staffId: z.string().min(1),
  clinicId: z.string().min(1),
  role: z.enum(['OWNER', 'VETERINARIAN', 'ASSISTANT', 'RECEPTIONIST']),
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable(),
  clinicName: z.string().min(1),
  clinicPhone: z.string().nullable(),
  clinicAddress: z.string().nullable(),
})

const ownerAccessSchema = z.object({
  kind: z.literal('owner'),
  ownerId: z.string().min(1),
  fullName: z.string().min(1),
  mobile: z.string().min(1),
  email: z.string().email().nullable(),
  address: z.string().nullable().default(null),
  claimedAt: z.string().nullable(),
})

function accessTokenSeconds() {
  return env.AUTH_ACCESS_TOKEN_MINUTES * 60
}

function refreshTokenSeconds() {
  return env.AUTH_REFRESH_TOKEN_DAYS * 24 * 60 * 60
}

function refreshExpiresAt() {
  return new Date(Date.now() + refreshTokenSeconds() * 1000)
}

function cookieOptions(maxAge: number) {
  return {
    path: '/',
    httpOnly: true,
    secure: env.NODE_ENV === 'production' || env.COOKIE_SECURE,
    sameSite: 'lax' as const,
    maxAge,
  }
}

function clearCookieOptions() {
  return {
    path: '/',
    httpOnly: true,
    secure: env.NODE_ENV === 'production' || env.COOKIE_SECURE,
    sameSite: 'lax' as const,
  }
}

function csrfCookieOptions(maxAge: number) {
  return {
    path: '/',
    httpOnly: false,
    secure: env.NODE_ENV === 'production' || env.COOKIE_SECURE,
    sameSite: 'lax' as const,
    maxAge,
  }
}

function clearCsrfCookieOptions() {
  return {
    path: '/',
    secure: env.NODE_ENV === 'production' || env.COOKIE_SECURE,
    sameSite: 'lax' as const,
  }
}

function createRefreshToken() {
  return crypto.randomBytes(32).toString('base64url')
}

function createCsrfToken() {
  return crypto.randomBytes(24).toString('base64url')
}

function hashRefreshToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function requestMetadata(request: FastifyRequest) {
  const userAgent = request.headers['user-agent']
  return {
    userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 500) : null,
    ipAddress: request.ip,
  }
}

function setStaffCookies(reply: FastifyReply, accessToken: string, refreshToken: string) {
  reply
    .setCookie(staffAccessCookie, accessToken, cookieOptions(accessTokenSeconds()))
    .setCookie(staffRefreshCookie, refreshToken, cookieOptions(refreshTokenSeconds()))
    .setCookie(staffCsrfCookie, createCsrfToken(), csrfCookieOptions(refreshTokenSeconds()))
}

function setOwnerCookies(reply: FastifyReply, accessToken: string, refreshToken: string) {
  reply
    .setCookie(ownerAccessCookie, accessToken, cookieOptions(accessTokenSeconds()))
    .setCookie(ownerRefreshCookie, refreshToken, cookieOptions(refreshTokenSeconds()))
    .setCookie(ownerCsrfCookie, createCsrfToken(), csrfCookieOptions(refreshTokenSeconds()))
}

export function clearStaffAuthCookies(reply: FastifyReply) {
  reply
    .clearCookie(staffAccessCookie, clearCookieOptions())
    .clearCookie(staffRefreshCookie, clearCookieOptions())
    .clearCookie(staffCsrfCookie, clearCsrfCookieOptions())
}

export function clearOwnerAuthCookies(reply: FastifyReply) {
  reply
    .clearCookie(ownerAccessCookie, clearCookieOptions())
    .clearCookie(ownerRefreshCookie, clearCookieOptions())
    .clearCookie(ownerCsrfCookie, clearCsrfCookieOptions())
}

function csrfHeader(request: FastifyRequest) {
  const header = request.headers['x-csrf-token']
  return typeof header === 'string' ? header : null
}

function isUnsafeMethod(method: string) {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())
}

function verifyCsrfToken(request: FastifyRequest, reply: FastifyReply, cookieName: string) {
  if (!isUnsafeMethod(request.method)) {
    return true
  }

  const token = request.cookies[cookieName]
  if (!token || csrfHeader(request) !== token) {
    reply.code(403).send({ message: 'Security check failed. Please refresh and try again.' })
    return false
  }

  return true
}

export function verifyStaffCsrfToken(request: FastifyRequest, reply: FastifyReply) {
  return verifyCsrfToken(request, reply, staffCsrfCookie)
}

export function verifyOwnerCsrfToken(request: FastifyRequest, reply: FastifyReply) {
  return verifyCsrfToken(request, reply, ownerCsrfCookie)
}

export function ensureStaffCsrfCookie(request: FastifyRequest, reply: FastifyReply) {
  if (!isUnsafeMethod(request.method) && !request.cookies[staffCsrfCookie]) {
    reply.setCookie(staffCsrfCookie, createCsrfToken(), csrfCookieOptions(refreshTokenSeconds()))
  }
}

export function ensureOwnerCsrfCookie(request: FastifyRequest, reply: FastifyReply) {
  if (!isUnsafeMethod(request.method) && !request.cookies[ownerCsrfCookie]) {
    reply.setCookie(ownerCsrfCookie, createCsrfToken(), csrfCookieOptions(refreshTokenSeconds()))
  }
}

export async function createStaffAuthSession(
  user: AuthUser,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const refreshToken = createRefreshToken()
  const accessToken = request.server.jwt.sign(user, {
    expiresIn: `${env.AUTH_ACCESS_TOKEN_MINUTES}m`,
  })

  await prisma.authSession.create({
    data: {
      kind: 'STAFF',
      staffId: user.staffId,
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshExpiresAt(),
      ...requestMetadata(request),
    },
  })

  setStaffCookies(reply, accessToken, refreshToken)
  return accessToken
}

export async function createOwnerAuthSession(
  user: OwnerSessionUser,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const refreshToken = createRefreshToken()
  const accessToken = request.server.jwt.sign(user as Record<string, unknown>, {
    expiresIn: `${env.AUTH_ACCESS_TOKEN_MINUTES}m`,
  })

  await prisma.authSession.create({
    data: {
      kind: 'OWNER',
      ownerId: user.ownerId,
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshExpiresAt(),
      ...requestMetadata(request),
    },
  })

  setOwnerCookies(reply, accessToken, refreshToken)
  return accessToken
}

export async function verifyStaffAccessCookie(request: FastifyRequest) {
  const token = request.cookies[staffAccessCookie]
  if (!token) {
    return null
  }

  const payload = await request.server.jwt.verify(token)
  return staffAccessSchema.parse(payload) satisfies AuthUser
}

export async function verifyOwnerAccessCookie(request: FastifyRequest) {
  const token = request.cookies[ownerAccessCookie]
  if (!token) {
    return null
  }

  const payload = await request.server.jwt.verify(token)
  return ownerAccessSchema.parse(payload)
}

export async function rotateStaffAuthSession(request: FastifyRequest, reply: FastifyReply) {
  const refreshToken = request.cookies[staffRefreshCookie]
  if (!refreshToken) {
    return null
  }

  const now = new Date()
  const session = await prisma.authSession.findFirst({
    where: {
      kind: 'STAFF',
      refreshTokenHash: hashRefreshToken(refreshToken),
      revokedAt: null,
      expiresAt: { gt: now },
      staffId: { not: null },
    },
    include: { staff: { include: { clinic: true } } },
  })

  if (!session?.staff || !session.staff.isActive) {
    return null
  }

  const nextRefreshToken = createRefreshToken()
  const user = toSessionUser(session.staff, session.staff.clinic)
  const accessToken = request.server.jwt.sign(user, {
    expiresIn: `${env.AUTH_ACCESS_TOKEN_MINUTES}m`,
  })

  await prisma.authSession.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: hashRefreshToken(nextRefreshToken),
      expiresAt: refreshExpiresAt(),
      ...requestMetadata(request),
    },
  })

  setStaffCookies(reply, accessToken, nextRefreshToken)
  return user
}

export async function rotateOwnerAuthSession(request: FastifyRequest, reply: FastifyReply) {
  const refreshToken = request.cookies[ownerRefreshCookie]
  if (!refreshToken) {
    return null
  }

  const now = new Date()
  const session = await prisma.authSession.findFirst({
    where: {
      kind: 'OWNER',
      refreshTokenHash: hashRefreshToken(refreshToken),
      revokedAt: null,
      expiresAt: { gt: now },
      ownerId: { not: null },
    },
    include: { owner: true },
  })

  if (!session?.owner) {
    return null
  }

  const nextRefreshToken = createRefreshToken()
  const user: OwnerSessionUser = {
    kind: 'owner',
    ownerId: session.owner.id,
    fullName: session.owner.fullName,
    mobile: session.owner.mobile,
    email: session.owner.email,
    address: session.owner.address,
    claimedAt: session.owner.claimedAt ? session.owner.claimedAt.toISOString() : null,
  }
  const accessToken = request.server.jwt.sign(user as Record<string, unknown>, {
    expiresIn: `${env.AUTH_ACCESS_TOKEN_MINUTES}m`,
  })

  await prisma.authSession.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: hashRefreshToken(nextRefreshToken),
      expiresAt: refreshExpiresAt(),
      ...requestMetadata(request),
    },
  })

  setOwnerCookies(reply, accessToken, nextRefreshToken)
  return user
}

export async function revokeStaffAuthSession(request: FastifyRequest) {
  const refreshToken = request.cookies[staffRefreshCookie]
  if (!refreshToken) {
    return
  }

  await prisma.authSession.updateMany({
    where: {
      kind: 'STAFF',
      refreshTokenHash: hashRefreshToken(refreshToken),
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  })
}

export async function revokeOwnerAuthSession(request: FastifyRequest) {
  const refreshToken = request.cookies[ownerRefreshCookie]
  if (!refreshToken) {
    return
  }

  await prisma.authSession.updateMany({
    where: {
      kind: 'OWNER',
      refreshTokenHash: hashRefreshToken(refreshToken),
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  })
}
