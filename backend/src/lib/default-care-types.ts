import { Prisma } from '@prisma/client'

const defaultCareTypes = [
  {
    name: 'Rabies',
    category: 'VACCINATION' as const,
    defaultIntervalValue: 1,
    defaultIntervalUnit: 'YEAR' as const,
    defaultIntervalDays: 365,
  },
  {
    name: '5-in-1',
    category: 'VACCINATION' as const,
    defaultIntervalValue: 1,
    defaultIntervalUnit: 'YEAR' as const,
    defaultIntervalDays: 365,
  },
  {
    name: 'Routine Deworming',
    category: 'DEWORMING' as const,
    defaultIntervalValue: 3,
    defaultIntervalUnit: 'MONTH' as const,
    defaultIntervalDays: 90,
  },
]

export async function createDefaultCareTypes(tx: Prisma.TransactionClient, clinicId: string) {
  await tx.careType.createMany({
    data: defaultCareTypes.map((careType) => ({
      clinicId,
      ...careType,
    })),
  })
}
