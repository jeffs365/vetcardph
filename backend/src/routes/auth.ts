import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { createAuditEntry } from '../lib/audit'
import {
  clearStaffAuthCookies,
  createStaffAuthSession,
  revokeStaffAuthSession,
  rotateStaffAuthSession,
  verifyStaffCsrfToken,
} from '../lib/auth-sessions'
import { requireAuth, requireOwner, hashPassword, verifyPassword } from '../lib/auth'
import { createDefaultCareTypes } from '../lib/default-care-types'
import {
  checkStaffLoginLimit,
  clearStaffLoginFailures,
  recordStaffLoginFailure,
} from '../lib/login-rate-limit'
import { toSessionUser } from '../lib/serializers'

const optionalPhoneSchema = z
  .string()
  .trim()
  .max(40)
  .refine((value) => !value || value.length >= 7, {
    message: 'Phone number must be at least 7 characters.',
  })

const registerClinicSchema = z.object({
  clinicName: z.string().trim().min(2).max(120),
  clinicPhone: optionalPhoneSchema,
  clinicAddress: z.string().trim().min(3).max(240),
  ownerName: z.string().trim().min(2).max(120),
  ownerPhone: optionalPhoneSchema,
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
})

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
})

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8).max(72),
    newPassword: z.string().min(8).max(72),
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: 'New password must be different from your current password.',
    path: ['newPassword'],
  })

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: optionalPhoneSchema,
  email: z.string().trim().toLowerCase().email(),
})

const updateClinicSchema = z.object({
  clinicName: z.string().trim().min(2).max(120),
  clinicPhone: optionalPhoneSchema,
  clinicAddress: z.string().trim().min(3).max(240),
})

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/register-clinic', async (request, reply) => {
    const input = registerClinicSchema.parse(request.body)

    const existing = await prisma.staff.findUnique({ where: { email: input.email } })
    if (existing) {
      return reply.code(409).send({ message: 'An account with that email already exists.' })
    }

    const passwordHash = await hashPassword(input.password)

    const { clinic, staff } = await prisma.$transaction(async (tx) => {
      const createdClinic = await tx.clinic.create({
        data: {
          name: input.clinicName,
          phone: input.clinicPhone || null,
          address: input.clinicAddress,
        },
      })

      const createdStaff = await tx.staff.create({
        data: {
          clinicId: createdClinic.id,
          fullName: input.ownerName,
          email: input.email,
          phone: input.ownerPhone || null,
          passwordHash,
          role: 'OWNER',
        },
      })

      await createDefaultCareTypes(tx, createdClinic.id)
      await createAuditEntry(tx, {
        clinicId: createdClinic.id,
        actorId: createdStaff.id,
        entityType: 'Clinic',
        entityId: createdClinic.id,
        action: 'CREATE',
        summary: 'Clinic and owner account created.',
        nextSnapshot: {
          clinicName: createdClinic.name,
          clinicPhone: createdClinic.phone,
          clinicAddress: createdClinic.address,
          ownerName: createdStaff.fullName,
          ownerEmail: createdStaff.email,
          ownerPhone: createdStaff.phone,
        },
      })

      return { clinic: createdClinic, staff: createdStaff }
    })

    const user = toSessionUser(staff, clinic)
    await createStaffAuthSession(user, request, reply)

    return reply.code(201).send({ user })
  })

  app.post('/login', async (request, reply) => {
    const input = loginSchema.parse(request.body)
    const loginLimit = checkStaffLoginLimit(input.email, request.ip)

    if (!loginLimit.allowed) {
      reply.header('Retry-After', String(loginLimit.retryAfterSeconds))
      return reply.code(429).send({
        message: 'Too many failed sign-in attempts. Please wait 15 minutes before trying again.',
      })
    }

    const staff = await prisma.staff.findUnique({
      where: { email: input.email },
      include: { clinic: true },
    })

    if (!staff || !staff.isActive) {
      recordStaffLoginFailure(input.email, request.ip)
      return reply.code(401).send({ message: 'Invalid email or password.' })
    }

    const isValid = await verifyPassword(input.password, staff.passwordHash)
    if (!isValid) {
      recordStaffLoginFailure(input.email, request.ip)
      return reply.code(401).send({ message: 'Invalid email or password.' })
    }

    clearStaffLoginFailures(input.email, request.ip)
    const user = toSessionUser(staff, staff.clinic)
    await createStaffAuthSession(user, request, reply)

    return { user }
  })

  app.post('/refresh', async (request, reply) => {
    const user = await rotateStaffAuthSession(request, reply)
    if (!user) {
      clearStaffAuthCookies(reply)
      return reply.code(401).send({ message: 'Authentication required.' })
    }

    return { user }
  })

  app.post('/logout', async (request, reply) => {
    if (!verifyStaffCsrfToken(request, reply)) {
      return
    }

    await revokeStaffAuthSession(request)
    clearStaffAuthCookies(reply)
    return { success: true }
  })

  app.get('/me', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const staff = await prisma.staff.findUnique({
      where: { id: request.user.staffId },
      include: { clinic: true },
    })

    if (!staff || !staff.isActive) {
      return reply.code(401).send({ message: 'Account is no longer active.' })
    }

    return { user: toSessionUser(staff, staff.clinic) }
  })

  app.patch('/me', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const input = updateProfileSchema.parse(request.body)

    const staff = await prisma.staff.findUnique({
      where: { id: request.user.staffId },
      include: { clinic: true },
    })

    if (!staff || !staff.isActive) {
      return reply.code(404).send({ message: 'Account not found.' })
    }

    if (staff.email !== input.email) {
      const existing = await prisma.staff.findUnique({
        where: { email: input.email },
      })

      if (existing && existing.id !== staff.id) {
        return reply.code(409).send({ message: 'An account with that email already exists.' })
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextStaff = await tx.staff.update({
        where: { id: staff.id },
        data: {
          fullName: input.fullName,
          phone: input.phone || null,
          email: input.email,
        },
        include: { clinic: true },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'Staff',
        entityId: staff.id,
        action: 'UPDATE',
        summary: 'Own account details updated.',
        previousSnapshot: {
          fullName: staff.fullName,
          phone: staff.phone,
          email: staff.email,
        },
        nextSnapshot: {
          fullName: nextStaff.fullName,
          phone: nextStaff.phone,
          email: nextStaff.email,
        },
      })

      return nextStaff
    })

    return { user: toSessionUser(updated, updated.clinic) }
  })

  app.patch('/clinic', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    if (!requireOwner(request.user, reply)) {
      return
    }

    const input = updateClinicSchema.parse(request.body)

    const staff = await prisma.staff.findUnique({
      where: { id: request.user.staffId },
      include: { clinic: true },
    })

    if (!staff || !staff.isActive) {
      return reply.code(404).send({ message: 'Account not found.' })
    }

    const clinic = await prisma.$transaction(async (tx) => {
      const nextClinic = await tx.clinic.update({
        where: { id: request.user.clinicId },
        data: {
          name: input.clinicName,
          phone: input.clinicPhone || null,
          address: input.clinicAddress,
        },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'Clinic',
        entityId: nextClinic.id,
        action: 'UPDATE',
        summary: 'Clinic information updated.',
        previousSnapshot: {
          clinicName: staff.clinic.name,
          clinicPhone: staff.clinic.phone,
          clinicAddress: staff.clinic.address,
        },
        nextSnapshot: {
          clinicName: nextClinic.name,
          clinicPhone: nextClinic.phone,
          clinicAddress: nextClinic.address,
        },
      })

      return nextClinic
    })

    return { user: toSessionUser(staff, clinic) }
  })

  app.post('/change-password', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const input = changePasswordSchema.parse(request.body)

    const staff = await prisma.staff.findUnique({
      where: { id: request.user.staffId },
    })

    if (!staff || !staff.isActive) {
      return reply.code(404).send({ message: 'Account not found.' })
    }

    const isValid = await verifyPassword(input.currentPassword, staff.passwordHash)
    if (!isValid) {
      return reply.code(401).send({ message: 'Current password is incorrect.' })
    }

    const passwordHash = await hashPassword(input.newPassword)

    await prisma.$transaction(async (tx) => {
      await tx.staff.update({
        where: { id: staff.id },
        data: { passwordHash },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'Staff',
        entityId: staff.id,
        action: 'UPDATE',
        summary: 'Password updated for own account.',
      })
    })

    return { success: true }
  })
}
