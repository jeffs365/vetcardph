import { Prisma } from '@prisma/client'

type JsonValue = Record<string, unknown> | Array<unknown> | string | number | boolean | null

type AuditInput = {
  clinicId: string
  actorId?: string
  entityType: string
  entityId: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESET_PASSWORD'
  summary?: string
  previousSnapshot?: JsonValue
  nextSnapshot?: JsonValue
}

export async function createAuditEntry(tx: Prisma.TransactionClient, input: AuditInput) {
  await tx.auditEntry.create({
    data: {
      clinicId: input.clinicId,
      actorId: input.actorId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      summary: input.summary,
      previousSnapshot:
        input.previousSnapshot === undefined ? null : JSON.stringify(input.previousSnapshot),
      nextSnapshot: input.nextSnapshot === undefined ? null : JSON.stringify(input.nextSnapshot),
    },
  })
}
