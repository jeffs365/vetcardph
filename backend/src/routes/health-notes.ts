import type { Prisma } from '@prisma/client'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { createAuditEntry } from '../lib/audit'
import { requireAuth } from '../lib/auth'
import { parseDateInput } from '../lib/dates'
import { toPetAllergy, toPetDietNote, toPetMedication } from '../lib/serializers'

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''))
const dateText = z.string().trim().optional().or(z.literal(''))

const allergySchema = z.object({
  allergen: z.string().trim().min(1).max(120),
  severity: optionalText(60),
  reaction: optionalText(200),
  notes: optionalText(500),
})

const medicationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  dose: optionalText(80),
  frequency: optionalText(80),
  route: optionalText(80),
  startDate: dateText,
  endDate: dateText,
  notes: optionalText(500),
})

const dietNoteSchema = z.object({
  dietName: z.string().trim().min(1).max(120),
  remarks: optionalText(500),
})

function emptyToNull(value: string | undefined) {
  return value?.trim() ? value.trim() : null
}

function dateOrNull(value: string | undefined) {
  return value?.trim() ? parseDateInput(value) : null
}

async function findAccessiblePet(tx: Prisma.TransactionClient, petId: string, clinicId: string) {
  return tx.pet.findFirst({
    where: {
      id: petId,
      clinicAccesses: {
        some: { clinicId },
      },
    },
    select: { id: true, name: true },
  })
}

export const healthNoteRoutes: FastifyPluginAsync = async (app) => {
  app.post('/pets/:petId/allergies', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const params = z.object({ petId: z.string().min(1) }).parse(request.params)
    const input = allergySchema.parse(request.body)

    const allergy = await prisma.$transaction(async (tx) => {
      const pet = await findAccessiblePet(tx, params.petId, request.user.clinicId)
      if (!pet) {
        return null
      }

      const created = await tx.petAllergy.create({
        data: {
          petId: pet.id,
          clinicId: request.user.clinicId,
          allergen: input.allergen,
          severity: emptyToNull(input.severity),
          reaction: emptyToNull(input.reaction),
          notes: emptyToNull(input.notes),
        },
        include: { clinic: { select: { name: true } } },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'PetAllergy',
        entityId: created.id,
        action: 'CREATE',
        summary: `Allergy ${created.allergen} added for ${pet.name}.`,
        nextSnapshot: created,
      })

      return created
    })

    if (!allergy) {
      return reply.code(404).send({ message: 'Pet not found.' })
    }

    return reply.code(201).send({ allergy: toPetAllergy(allergy, request.user.clinicId) })
  })

  app.put('/pet-allergies/:allergyId', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const params = z.object({ allergyId: z.string().min(1) }).parse(request.params)
    const input = allergySchema.parse(request.body)

    const allergy = await prisma.$transaction(async (tx) => {
      const existing = await tx.petAllergy.findFirst({
        where: { id: params.allergyId, clinicId: request.user.clinicId },
        include: { pet: { select: { name: true } } },
      })
      if (!existing) {
        return null
      }

      const updated = await tx.petAllergy.update({
        where: { id: existing.id },
        data: {
          allergen: input.allergen,
          severity: emptyToNull(input.severity),
          reaction: emptyToNull(input.reaction),
          notes: emptyToNull(input.notes),
          isActive: true,
        },
        include: { clinic: { select: { name: true } } },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'PetAllergy',
        entityId: updated.id,
        action: 'UPDATE',
        summary: `Allergy ${updated.allergen} updated for ${existing.pet.name}.`,
        previousSnapshot: existing,
        nextSnapshot: updated,
      })

      return updated
    })

    if (!allergy) {
      return reply.code(404).send({ message: 'Allergy not found.' })
    }

    return { allergy: toPetAllergy(allergy, request.user.clinicId) }
  })

  app.delete('/pet-allergies/:allergyId', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const params = z.object({ allergyId: z.string().min(1) }).parse(request.params)

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.petAllergy.findFirst({
        where: { id: params.allergyId, clinicId: request.user.clinicId, isActive: true },
        include: { pet: { select: { name: true } } },
      })
      if (!existing) {
        return null
      }

      const allergy = await tx.petAllergy.update({
        where: { id: existing.id },
        data: { isActive: false },
        include: { clinic: { select: { name: true } } },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'PetAllergy',
        entityId: allergy.id,
        action: 'DELETE',
        summary: `Allergy ${allergy.allergen} marked inactive for ${existing.pet.name}.`,
        previousSnapshot: existing,
        nextSnapshot: allergy,
      })

      return allergy
    })

    if (!updated) {
      return reply.code(404).send({ message: 'Allergy not found.' })
    }

    return { allergy: toPetAllergy(updated, request.user.clinicId) }
  })

  app.post('/pets/:petId/medications', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const params = z.object({ petId: z.string().min(1) }).parse(request.params)
    const input = medicationSchema.parse(request.body)

    const medication = await prisma.$transaction(async (tx) => {
      const pet = await findAccessiblePet(tx, params.petId, request.user.clinicId)
      if (!pet) {
        return null
      }

      const created = await tx.petMedication.create({
        data: {
          petId: pet.id,
          clinicId: request.user.clinicId,
          name: input.name,
          dose: emptyToNull(input.dose),
          frequency: emptyToNull(input.frequency),
          route: emptyToNull(input.route),
          startDate: dateOrNull(input.startDate),
          endDate: dateOrNull(input.endDate),
          notes: emptyToNull(input.notes),
        },
        include: { clinic: { select: { name: true } } },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'PetMedication',
        entityId: created.id,
        action: 'CREATE',
        summary: `Medication ${created.name} added for ${pet.name}.`,
        nextSnapshot: created,
      })

      return created
    })

    if (!medication) {
      return reply.code(404).send({ message: 'Pet not found.' })
    }

    return reply.code(201).send({ medication: toPetMedication(medication, request.user.clinicId) })
  })

  app.put('/pet-medications/:medicationId', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const params = z.object({ medicationId: z.string().min(1) }).parse(request.params)
    const input = medicationSchema.parse(request.body)

    const medication = await prisma.$transaction(async (tx) => {
      const existing = await tx.petMedication.findFirst({
        where: { id: params.medicationId, clinicId: request.user.clinicId },
        include: { pet: { select: { name: true } } },
      })
      if (!existing) {
        return null
      }

      const updated = await tx.petMedication.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          dose: emptyToNull(input.dose),
          frequency: emptyToNull(input.frequency),
          route: emptyToNull(input.route),
          startDate: dateOrNull(input.startDate),
          endDate: dateOrNull(input.endDate),
          notes: emptyToNull(input.notes),
          isActive: true,
        },
        include: { clinic: { select: { name: true } } },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'PetMedication',
        entityId: updated.id,
        action: 'UPDATE',
        summary: `Medication ${updated.name} updated for ${existing.pet.name}.`,
        previousSnapshot: existing,
        nextSnapshot: updated,
      })

      return updated
    })

    if (!medication) {
      return reply.code(404).send({ message: 'Medication not found.' })
    }

    return { medication: toPetMedication(medication, request.user.clinicId) }
  })

  app.delete('/pet-medications/:medicationId', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const params = z.object({ medicationId: z.string().min(1) }).parse(request.params)

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.petMedication.findFirst({
        where: { id: params.medicationId, clinicId: request.user.clinicId, isActive: true },
        include: { pet: { select: { name: true } } },
      })
      if (!existing) {
        return null
      }

      const medication = await tx.petMedication.update({
        where: { id: existing.id },
        data: { isActive: false },
        include: { clinic: { select: { name: true } } },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'PetMedication',
        entityId: medication.id,
        action: 'DELETE',
        summary: `Medication ${medication.name} marked inactive for ${existing.pet.name}.`,
        previousSnapshot: existing,
        nextSnapshot: medication,
      })

      return medication
    })

    if (!updated) {
      return reply.code(404).send({ message: 'Medication not found.' })
    }

    return { medication: toPetMedication(updated, request.user.clinicId) }
  })

  app.post('/pets/:petId/diet-notes', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const params = z.object({ petId: z.string().min(1) }).parse(request.params)
    const input = dietNoteSchema.parse(request.body)

    const dietNote = await prisma.$transaction(async (tx) => {
      const pet = await findAccessiblePet(tx, params.petId, request.user.clinicId)
      if (!pet) {
        return null
      }

      const created = await tx.petDietNote.create({
        data: {
          petId: pet.id,
          clinicId: request.user.clinicId,
          dietName: input.dietName,
          remarks: emptyToNull(input.remarks),
        },
        include: { clinic: { select: { name: true } } },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'PetDietNote',
        entityId: created.id,
        action: 'CREATE',
        summary: `Diet note ${created.dietName} added for ${pet.name}.`,
        nextSnapshot: created,
      })

      return created
    })

    if (!dietNote) {
      return reply.code(404).send({ message: 'Pet not found.' })
    }

    return reply.code(201).send({ dietNote: toPetDietNote(dietNote, request.user.clinicId) })
  })

  app.put('/pet-diet-notes/:dietNoteId', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const params = z.object({ dietNoteId: z.string().min(1) }).parse(request.params)
    const input = dietNoteSchema.parse(request.body)

    const dietNote = await prisma.$transaction(async (tx) => {
      const existing = await tx.petDietNote.findFirst({
        where: { id: params.dietNoteId, clinicId: request.user.clinicId },
        include: { pet: { select: { name: true } } },
      })
      if (!existing) {
        return null
      }

      const updated = await tx.petDietNote.update({
        where: { id: existing.id },
        data: {
          dietName: input.dietName,
          remarks: emptyToNull(input.remarks),
          isActive: true,
        },
        include: { clinic: { select: { name: true } } },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'PetDietNote',
        entityId: updated.id,
        action: 'UPDATE',
        summary: `Diet note ${updated.dietName} updated for ${existing.pet.name}.`,
        previousSnapshot: existing,
        nextSnapshot: updated,
      })

      return updated
    })

    if (!dietNote) {
      return reply.code(404).send({ message: 'Diet note not found.' })
    }

    return { dietNote: toPetDietNote(dietNote, request.user.clinicId) }
  })

  app.delete('/pet-diet-notes/:dietNoteId', async (request, reply) => {
    const isAuthenticated = await requireAuth(request, reply)
    if (!isAuthenticated) {
      return
    }

    const params = z.object({ dietNoteId: z.string().min(1) }).parse(request.params)

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.petDietNote.findFirst({
        where: { id: params.dietNoteId, clinicId: request.user.clinicId, isActive: true },
        include: { pet: { select: { name: true } } },
      })
      if (!existing) {
        return null
      }

      const dietNote = await tx.petDietNote.update({
        where: { id: existing.id },
        data: { isActive: false },
        include: { clinic: { select: { name: true } } },
      })

      await createAuditEntry(tx, {
        clinicId: request.user.clinicId,
        actorId: request.user.staffId,
        entityType: 'PetDietNote',
        entityId: dietNote.id,
        action: 'DELETE',
        summary: `Diet note ${dietNote.dietName} marked inactive for ${existing.pet.name}.`,
        previousSnapshot: existing,
        nextSnapshot: dietNote,
      })

      return dietNote
    })

    if (!updated) {
      return reply.code(404).send({ message: 'Diet note not found.' })
    }

    return { dietNote: toPetDietNote(updated, request.user.clinicId) }
  })
}
