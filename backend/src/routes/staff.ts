import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { createAuditEntry } from '../lib/audit'
import { hashPassword, requireAuth, requireOwner } from '../lib/auth'

const optionalPhoneSchema = z
  .string()
  .trim()
  .max(40)
  .refine((value) => !value || value.length >= 7, {
    message: 'Phone number must be at least 7 characters.',
  })

const createStaffSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  phone: optionalPhoneSchema,
  role: z.enum(['VETERINARIAN', 'ASSISTANT', 'RECEPTIONIST']),
  password: z.string().min(8).max(72),
})

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8).max(72),
})

export const staffRoutes: FastifyPluginAsync = async (app) => {
  app.get('/staff', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const query = z.object({ includeInactive: z.coerce.boolean().default(false) }).parse(request.query)

    const staff = await prisma.staff.findMany({
      where: {
        clinicId: request.user.clinicId,
        ...(query.includeInactive ? {} : { isActive: true }),
      },
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
      },
    })

    return { staff }
  })

  app.post('/staff', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    if (!requireOwner(request.user, reply)) {
      return
    }

    const input = createStaffSchema.parse(request.body)

    const existing = await prisma.staff.findUnique({
      where: { email: input.email },
    })

    if (existing) {
      return reply.code(409).send({ message: 'An account with that email already exists.' })
    }

    const passwordHash = await hashPassword(input.password)

    const staff = await prisma.$transaction(async (tx) => {
      const created = await tx.staff.create({
        data: {
          clinicId: request.user.clinicId,
          fullName: input.fullName,
          email: input.email,
          phone: input.phone || null,
          passwordHash,
          role: input.role,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
        },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'Staff',
        entityId: created.id,
        action: 'CREATE',
        summary: `Staff account created for ${created.fullName}.`,
        nextSnapshot: created,
      })

      return created
    })

    return reply.code(201).send({ staff })
  })

  app.post('/staff/:staffId/reset-password', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    if (!requireOwner(request.user, reply)) {
      return
    }

    const params = z.object({ staffId: z.string().min(1) }).parse(request.params)
    const input = resetPasswordSchema.parse(request.body)
    const passwordHash = await hashPassword(input.newPassword)

    const staff = await prisma.staff.findFirst({
      where: { id: params.staffId, clinicId: request.user.clinicId },
    })

    if (!staff) {
      return reply.code(404).send({ message: 'Staff member not found.' })
    }

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
        action: 'RESET_PASSWORD',
        summary: `Password reset for ${staff.fullName}.`,
      })
    })

    return { success: true }
  })

  app.patch('/staff/:staffId', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    if (!requireOwner(request.user, reply)) {
      return
    }

    const params = z.object({ staffId: z.string().min(1) }).parse(request.params)
    const input = z.object({ isActive: z.boolean() }).parse(request.body)

    const staff = await prisma.staff.findFirst({
      where: { id: params.staffId, clinicId: request.user.clinicId },
    })

    if (!staff) {
      return reply.code(404).send({ message: 'Staff member not found.' })
    }

    if (staff.id === request.user.staffId) {
      return reply.code(400).send({ message: 'You cannot deactivate your own account.' })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.staff.update({
        where: { id: staff.id },
        data: { isActive: input.isActive },
        select: { id: true, fullName: true, email: true, phone: true, role: true, isActive: true },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'Staff',
        entityId: staff.id,
        action: 'UPDATE',
        summary: input.isActive ? `${staff.fullName} reactivated.` : `${staff.fullName} deactivated.`,
        previousSnapshot: staff,
        nextSnapshot: result,
      })

      return result
    })

    return { staff: updated }
  })
}
