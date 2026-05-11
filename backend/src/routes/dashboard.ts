import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../db'
import { addDays, endOfDay, startOfDay } from '../lib/dates'
import { requireAuth } from '../lib/auth'
import { toOwnerSummary, toVisitHistoryRecord } from '../lib/serializers'

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get('/dashboard/summary', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const clinicId = request.user.clinicId
    const today = startOfDay(new Date())
    const dueSoonLimit = endOfDay(addDays(today, 7))

    const [petCount, overdueCount, dueSoonCount, recentVisits, recentDueRecords] = await prisma.$transaction([
      prisma.clinicPetAccess.count({ where: { clinicId } }),
      prisma.preventiveSchedule.count({
        where: { clinicId, status: 'OPEN', nextDueDate: { lt: today } },
      }),
      prisma.preventiveSchedule.count({
        where: {
          clinicId,
          status: 'OPEN',
          nextDueDate: {
            gte: today,
            lte: dueSoonLimit,
          },
        },
      }),
      prisma.visit.findMany({
        where: { clinicId },
        orderBy: { visitDate: 'desc' },
        take: 5,
        include: {
          pet: { select: { id: true, name: true } },
          attendedBy: { select: { id: true, fullName: true, role: true } },
        },
      }),
      prisma.preventiveSchedule.findMany({
        where: {
          clinicId,
          status: 'OPEN',
          nextDueDate: {
            lte: dueSoonLimit,
          },
        },
        orderBy: { nextDueDate: 'asc' },
        take: 5,
        include: {
          pet: {
            select: {
              id: true,
              name: true,
              species: true,
              owner: { select: { id: true, fullName: true, mobile: true, address: true, email: true } },
            },
          },
          careType: {
            select: {
              name: true,
              category: true,
              defaultIntervalValue: true,
              defaultIntervalUnit: true,
              defaultIntervalDays: true,
            },
          },
        },
      }),
    ])

    return {
      petCount,
      overdueCount,
      dueSoonCount,
      recentVisits: recentVisits.map((visit) => ({
        ...toVisitHistoryRecord(
          {
            ...visit,
            appointmentId: null,
            findingsNotes: '',
            treatmentGiven: '',
            diagnosis: null,
            followUpNotes: null,
          },
          request.user.clinicId,
        ),
        pet: visit.pet,
      })),
      recentDueRecords: recentDueRecords.map((record) => ({
        id: record.id,
        nextDueDate: record.nextDueDate,
        pet: {
          ...record.pet,
          owner: toOwnerSummary(record.pet.owner),
        },
        careType: record.careType,
      })),
    }
  })
}
