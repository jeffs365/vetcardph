import type { FastifyPluginAsync } from 'fastify'
import type { AppointmentStatus, StaffRole } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../db'
import { createAuditEntry } from '../lib/audit'
import { endOfDay, parseDateInput, startOfDay } from '../lib/dates'
import { requireAuth, requireStaffRole } from '../lib/auth'
import { toOwnerSummary } from '../lib/serializers'

const appointmentSchema = z.object({
  petId: z.string().min(1),
  scheduledDate: z.string().min(1),
  scheduledTime: z.string().min(1),
  reason: z.string().trim().min(2).max(200),
  notes: z.string().trim().min(2).max(1000),
})

const appointmentStatusSchema = z.object({
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'MISSED']),
})

const appointmentEditorRoles: StaffRole[] = ['OWNER', 'VETERINARIAN', 'RECEPTIONIST']
const allowedStatusTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ['CANCELLED', 'MISSED'],
  MISSED: ['SCHEDULED'],
  CANCELLED: ['SCHEDULED'],
  COMPLETED: [],
}

function parseAppointmentDateTime(date: string, time: string) {
  return parseDateInput(`${date}T${time}`)
}

function isPastAppointment(date: Date) {
  return date <= new Date()
}

export const appointmentRoutes: FastifyPluginAsync = async (app) => {
  app.get('/appointments/summary', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const today = startOfDay(new Date())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const appointments = await prisma.appointment.findMany({
      where: {
        clinicId: request.user.clinicId,
        status: {
          in: ['SCHEDULED', 'MISSED'],
        },
      },
      select: {
        scheduledFor: true,
        status: true,
      },
    })

    const summary = appointments.reduce(
      (counts, appointment) => {
        if (appointment.status === 'MISSED') {
          counts.due += 1
        } else if (appointment.scheduledFor < today) {
          counts.due += 1
        } else if (appointment.scheduledFor >= today && appointment.scheduledFor < tomorrow) {
          counts.today += 1
        } else {
          counts.upcoming += 1
        }

        return counts
      },
      { today: 0, due: 0, upcoming: 0 },
    )

    return summary
  })

  app.get('/appointments/:appointmentId', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const params = z.object({ appointmentId: z.string().min(1) }).parse(request.params)

    const appointment = await prisma.appointment.findFirst({
      where: {
        id: params.appointmentId,
        clinicId: request.user.clinicId,
      },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true,
            color: true,
            sex: true,
            avatarUrl: true,
            birthDate: true,
            ageLabel: true,
            weightKg: true,
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
        createdBy: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
    })

    if (!appointment) {
      return reply.code(404).send({ message: 'Appointment not found.' })
    }

    return {
      appointment: {
        ...appointment,
        pet: {
          ...appointment.pet,
          owner: toOwnerSummary(appointment.pet.owner),
        },
      },
    }
  })

  app.get('/appointments', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const query = z
      .object({
        date: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        petId: z.string().optional(),
        status: z.enum(['all', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'MISSED']).default('all'),
      })
      .parse(request.query)

    const rangeStart = query.date
      ? startOfDay(parseDateInput(query.date))
      : query.startDate
        ? startOfDay(parseDateInput(query.startDate))
        : undefined
    const rangeEnd = query.date
      ? endOfDay(parseDateInput(query.date))
      : query.endDate
        ? endOfDay(parseDateInput(query.endDate))
        : undefined

    const appointments = await prisma.appointment.findMany({
      where: {
        clinicId: request.user.clinicId,
        petId: query.petId,
        status: query.status === 'all' ? undefined : query.status,
        scheduledFor:
          rangeStart || rangeEnd
            ? {
                gte: rangeStart,
                lte: rangeEnd,
              }
            : undefined,
      },
      orderBy: { scheduledFor: 'asc' },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true,
            color: true,
            sex: true,
            avatarUrl: true,
            weightKg: true,
            birthDate: true,
            ageLabel: true,
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
        createdBy: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
    })

    return {
      appointments: appointments.map((appointment) => ({
        ...appointment,
        pet: {
          ...appointment.pet,
          owner: toOwnerSummary(appointment.pet.owner),
        },
      })),
    }
  })

  app.post('/appointments', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }
    if (!requireStaffRole(request.user, reply, appointmentEditorRoles)) {
      return
    }

    const input = appointmentSchema.parse(request.body)

    const pet = await prisma.pet.findFirst({
      where: {
        id: input.petId,
        clinicAccesses: {
          some: {
            clinicId: request.user.clinicId,
          },
        },
      },
      select: { id: true, name: true },
    })

    if (!pet) {
      return reply.code(404).send({ message: 'Pet not found.' })
    }

    const scheduledFor = parseAppointmentDateTime(input.scheduledDate, input.scheduledTime)

    if (isPastAppointment(scheduledFor)) {
      return reply.code(400).send({ message: 'Choose a future appointment time.' })
    }

    const appointment = await prisma.$transaction(async (tx) => {
      const created = await tx.appointment.create({
        data: {
          clinicId: request.user.clinicId,
          petId: pet.id,
          createdById: request.user.staffId,
          scheduledFor,
          reason: input.reason,
          notes: input.notes,
        },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'Appointment',
        entityId: created.id,
        action: 'CREATE',
        summary: `Appointment scheduled for ${pet.name}.`,
        nextSnapshot: created,
      })

      return created
    })

    return reply.code(201).send({ appointment })
  })

  app.put('/appointments/:appointmentId', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }
    if (!requireStaffRole(request.user, reply, appointmentEditorRoles)) {
      return
    }

    const params = z.object({ appointmentId: z.string().min(1) }).parse(request.params)
    const input = appointmentSchema.parse(request.body)

    const existing = await prisma.appointment.findFirst({
      where: {
        id: params.appointmentId,
        clinicId: request.user.clinicId,
      },
    })

    if (!existing) {
      return reply.code(404).send({ message: 'Appointment not found.' })
    }

    if (existing.status === 'COMPLETED') {
      return reply.code(409).send({ message: 'Completed appointments cannot be edited.' })
    }

    const pet = await prisma.pet.findFirst({
      where: {
        id: input.petId,
        clinicAccesses: {
          some: {
            clinicId: request.user.clinicId,
          },
        },
      },
      select: { id: true, name: true },
    })

    if (!pet) {
      return reply.code(404).send({ message: 'Pet not found.' })
    }

    const scheduledFor = parseAppointmentDateTime(input.scheduledDate, input.scheduledTime)

    if (isPastAppointment(scheduledFor)) {
      return reply.code(400).send({ message: 'Choose a future appointment time.' })
    }

    const appointment = await prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id: existing.id },
        data: {
          petId: pet.id,
          scheduledFor,
          reason: input.reason,
          notes: input.notes,
          status: existing.status === 'MISSED' || existing.status === 'CANCELLED' ? 'SCHEDULED' : undefined,
        },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'Appointment',
        entityId: updated.id,
        action: 'UPDATE',
        summary: `Appointment updated for ${pet.name}.`,
        previousSnapshot: existing,
        nextSnapshot: updated,
      })

      return updated
    })

    return { appointment }
  })

  app.patch('/appointments/:appointmentId/status', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }
    if (!requireStaffRole(request.user, reply, appointmentEditorRoles)) {
      return
    }

    const params = z.object({ appointmentId: z.string().min(1) }).parse(request.params)
    const input = appointmentStatusSchema.parse(request.body)

    const existing = await prisma.appointment.findFirst({
      where: {
        id: params.appointmentId,
        clinicId: request.user.clinicId,
      },
    })

    if (!existing) {
      return reply.code(404).send({ message: 'Appointment not found.' })
    }

    if (existing.status === input.status) {
      return { appointment: existing }
    }

    if (!allowedStatusTransitions[existing.status].includes(input.status)) {
      return reply.code(400).send({
        message:
          input.status === 'COMPLETED'
            ? 'Record a visit to complete an appointment.'
            : `Cannot change appointment from ${existing.status.toLowerCase()} to ${input.status.toLowerCase()}.`,
      })
    }

    const appointment = await prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id: existing.id },
        data: { status: input.status },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'Appointment',
        entityId: updated.id,
        action: 'UPDATE',
        summary: `Appointment marked ${input.status.toLowerCase()}.`,
        previousSnapshot: existing,
        nextSnapshot: updated,
      })

      return updated
    })

    return { appointment }
  })

  app.delete('/appointments/:appointmentId', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }
    if (!requireStaffRole(request.user, reply, appointmentEditorRoles)) {
      return
    }

    const params = z.object({ appointmentId: z.string().min(1) }).parse(request.params)

    const existing = await prisma.appointment.findFirst({
      where: {
        id: params.appointmentId,
        clinicId: request.user.clinicId,
      },
      include: {
        pet: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!existing) {
      return reply.code(404).send({ message: 'Appointment not found.' })
    }

    await prisma.$transaction(async (tx) => {
      await tx.appointment.delete({
        where: { id: existing.id },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'Appointment',
        entityId: existing.id,
        action: 'DELETE',
        summary: `Appointment deleted for ${existing.pet.name}.`,
        previousSnapshot: existing,
      })
    })

    return reply.code(204).send()
  })
}
