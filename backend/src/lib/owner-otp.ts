import crypto from 'node:crypto'
import { prisma } from '../db'

const OTP_TTL_MS = 5 * 60 * 1000
const MAX_ATTEMPTS_PER_WINDOW = 3
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000

function createOtpCode() {
  return `${Math.floor(100000 + Math.random() * 900000)}`
}

function hashCode(code: string) {
  return crypto.createHash('sha256').update(code).digest('hex')
}

async function countRecentAttempts(mobile: string) {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS)
  return prisma.ownerOtp.count({
    where: {
      mobile,
      createdAt: { gte: windowStart },
    },
  })
}

export async function issueOwnerOtpCode(mobile: string) {
  const recentCount = await countRecentAttempts(mobile)

  if (recentCount >= MAX_ATTEMPTS_PER_WINDOW) {
    return { rateLimited: true as const }
  }

  const code = createOtpCode()

  await prisma.ownerOtp.create({
    data: {
      mobile,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  })

  return {
    rateLimited: false as const,
    code,
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
  }
}

export async function verifyOwnerOtpCode(mobile: string, code: string) {
  const otp = await prisma.ownerOtp.findFirst({
    where: {
      mobile,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!otp) {
    return false
  }

  if (otp.codeHash !== hashCode(code.trim())) {
    await prisma.ownerOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    })
    return false
  }

  await prisma.ownerOtp.update({
    where: { id: otp.id },
    data: { usedAt: new Date() },
  })

  return true
}
