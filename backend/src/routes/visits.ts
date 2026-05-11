import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { createAuditEntry } from '../lib/audit'
import { endOfDay, parseDateInput, startOfDay } from '../lib/dates'
import { requireAuth } from '../lib/auth'
import { toOwnerSummary, toVisitHistoryRecord } from '../lib/serializers'

const visitSchema = z.object({
  visitDate: z.string().min(1),
  attendedById: z.string().min(1),
  weightKg: z.coerce.number().positive().max(200).optional().or(z.literal('')),
  reasonForVisit: z.string().trim().min(2).max(160),
  findingsNotes: z.string().trim().min(2).max(5000),
  treatmentGiven: z.string().trim().min(2).max(5000),
  diagnosis: z.string().trim().max(200).optional().or(z.literal('')),
  followUpNotes: z.string().trim().max(500).optional().or(z.literal('')),
  appointmentId: z.string().min(1).optional().or(z.literal('')),
})

export const visitRoutes: FastifyPluginAsync = async (app) => {
  app.get('/visits/:visitId', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const params = z.object({ visitId: z.string().min(1) }).parse(request.params)

    const visit = await prisma.visit.findFirst({
      where: { id: params.visitId, clinicId: request.user.clinicId },
      include: {
        attendedBy: { select: { id: true, fullName: true, role: true } },
        pet: { select: { id: true, name: true } },
      },
    })

    if (!visit) {
      return reply.code(404).send({ message: 'Visit not found.' })
    }

    return {
      visit: {
        ...toVisitHistoryRecord(visit, request.user.clinicId),
        pet: visit.pet,
      },
    }
  })

  app.get('/visits', async (request, reply) => {
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

    const visits = await prisma.visit.findMany({
      where: {
        clinicId: request.user.clinicId,
        petId: query.petId,
        visitDate:
          rangeStart || rangeEnd
            ? {
                gte: rangeStart,
                lte: rangeEnd,
              }
            : undefined,
      },
      orderBy: [{ visitDate: 'asc' }, { createdAt: 'asc' }],
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true,
            color: true,
            sex: true,
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
        attendedBy: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
    })

    return {
      visits: visits.map((visit) => ({
        ...visit,
        pet: {
          ...visit.pet,
          owner: toOwnerSummary(visit.pet.owner),
        },
      })),
    }
  })

  app.post('/pets/:petId/visits', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const params = z.object({ petId: z.string().min(1) }).parse(request.params)
    const input = visitSchema.parse(request.body)

    const [pet, attendedBy, appointment, existingLinkedVisit] = await Promise.all([
      prisma.pet.findFirst({
        where: {
          id: params.petId,
          clinicAccesses: {
            some: {
              clinicId: request.user.clinicId,
            },
          },
        },
      }),
      prisma.staff.findFirst({
        where: { id: input.attendedById, clinicId: request.user.clinicId, isActive: true },
      }),
      input.appointmentId
        ? prisma.appointment.findFirst({
            where: { id: input.appointmentId, clinicId: request.user.clinicId },
          })
        : Promise.resolve(null),
      input.appointmentId
        ? prisma.visit.findFirst({
            where: {
              clinicId: request.user.clinicId,
              appointmentId: input.appointmentId,
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ])

    if (!pet) {
      return reply.code(404).send({ message: 'Pet not found.' })
    }

    if (!attendedBy) {
      return reply.code(404).send({ message: 'Attending staff member not found.' })
    }

    if (input.appointmentId && !appointment) {
      return reply.code(404).send({ message: 'Appointment not found.' })
    }

    if (appointment && appointment.petId !== pet.id) {
      return reply.code(400).send({ message: 'Appointment does not belong to this pet.' })
    }

    if (existingLinkedVisit) {
      return reply.code(409).send({ message: 'That appointment already has a visit record.' })
    }

    const visit = await prisma.$transaction(async (tx) => {
      const created = await tx.visit.create({
        data: {
          clinicId: request.user.clinicId,
          petId: pet.id,
          appointmentId: appointment?.id ?? null,
          attendedById: attendedBy.id,
          createdById: request.user.staffId,
          visitDate: parseDateInput(input.visitDate),
          weightKg: input.weightKg === '' ? null : input.weightKg ?? null,
          reasonForVisit: input.reasonForVisit,
          findingsNotes: input.findingsNotes,
          treatmentGiven: input.treatmentGiven,
          diagnosis: input.diagnosis || null,
          followUpNotes: input.followUpNotes || null,
        },
      })

      if (appointment && appointment.status !== 'COMPLETED') {
        const updatedAppointment = await tx.appointment.update({
          where: { id: appointment.id },
          data: { status: 'COMPLETED' },
        })

        await createAuditEntry(tx, {
          clinicId: request.user.clinicId,
          actorId: request.user.staffId,
          entityType: 'Appointment',
          entityId: updatedAppointment.id,
          action: 'UPDATE',
          summary: `Appointment completed after visit for ${pet.name}.`,
          previousSnapshot: appointment,
          nextSnapshot: updatedAppointment,
        })
      }

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'Visit',
        entityId: created.id,
        action: 'CREATE',
        summary: `Visit logged for ${pet.name}.`,
        nextSnapshot: created,
      })

      return created
    })

    return reply.code(201).send({ visit })
  })

  app.put('/visits/:visitId', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const params = z.object({ visitId: z.string().min(1) }).parse(request.params)
    const input = visitSchema.parse(request.body)

    const existing = await prisma.visit.findFirst({
      where: { id: params.visitId, clinicId: request.user.clinicId },
    })

    if (!existing) {
      return reply.code(404).send({ message: 'Visit not found.' })
    }

    const attendedBy = await prisma.staff.findFirst({
      where: { id: input.attendedById, clinicId: request.user.clinicId, isActive: true },
    })

    if (!attendedBy) {
      return reply.code(404).send({ message: 'Attending staff member not found.' })
    }

    const visit = await prisma.$transaction(async (tx) => {
      const updated = await tx.visit.update({
        where: { id: existing.id },
        data: {
          attendedById: attendedBy.id,
          visitDate: parseDateInput(input.visitDate),
          weightKg: input.weightKg === '' ? null : input.weightKg ?? null,
          reasonForVisit: input.reasonForVisit,
          findingsNotes: input.findingsNotes,
          treatmentGiven: input.treatmentGiven,
          diagnosis: input.diagnosis || null,
          followUpNotes: input.followUpNotes || null,
        },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'Visit',
        entityId: updated.id,
        action: 'UPDATE',
        summary: 'Visit updated.',
        previousSnapshot: existing,
        nextSnapshot: updated,
      })

      return updated
    })

    return { visit }
  })

  app.delete('/visits/:visitId', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const params = z.object({ visitId: z.string().min(1) }).parse(request.params)

    const existing = await prisma.visit.findFirst({
      where: { id: params.visitId, clinicId: request.user.clinicId },
      include: { pet: { select: { name: true } } },
    })

    if (!existing) {
      return reply.code(404).send({ message: 'Visit not found.' })
    }

    await prisma.$transaction(async (tx) => {
      await tx.visit.delete({ where: { id: existing.id } })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'Visit',
        entityId: existing.id,
        action: 'DELETE',
        summary: `Visit deleted for ${existing.pet.name}.`,
        previousSnapshot: existing,
      })
    })

    return reply.code(204).send()
  })
}
