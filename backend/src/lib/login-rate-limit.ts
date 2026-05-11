const LOGIN_WINDOW_MS = 15 * 60 * 1000
const MAX_FAILED_ATTEMPTS = 5

type LoginAttemptBucket = {
  count: number
  firstAttemptAt: number
  lockedUntil?: number
}

const staffLoginAttempts = new Map<string, LoginAttemptBucket>()

function getNow() {
  return Date.now()
}

function getLoginKey(email: string, ip: string) {
  return `${email.toLowerCase()}:${ip}`
}

function pruneExpiredBucket(key: string, bucket: LoginAttemptBucket, now: number) {
  if (bucket.lockedUntil && bucket.lockedUntil > now) {
    return bucket
  }

  if (now - bucket.firstAttemptAt <= LOGIN_WINDOW_MS) {
    return bucket
  }

  staffLoginAttempts.delete(key)
  return null
}

export function checkStaffLoginLimit(email: string, ip: string) {
  const key = getLoginKey(email, ip)
  const now = getNow()
  const bucket = staffLoginAttempts.get(key)

  if (!bucket) {
    return { allowed: true, retryAfterSeconds: 0 }
  }

  const activeBucket = pruneExpiredBucket(key, bucket, now)
  if (!activeBucket) {
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (activeBucket.lockedUntil && activeBucket.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((activeBucket.lockedUntil - now) / 1000),
    }
  }

  return { allowed: true, retryAfterSeconds: 0 }
}

export function recordStaffLoginFailure(email: string, ip: string) {
  const key = getLoginKey(email, ip)
  const now = getNow()
  const bucket = pruneExpiredBucket(
    key,
    staffLoginAttempts.get(key) ?? { count: 0, firstAttemptAt: now },
    now,
  ) ?? { count: 0, firstAttemptAt: now }

  const nextCount = bucket.count + 1
  staffLoginAttempts.set(key, {
    count: nextCount,
    firstAttemptAt: bucket.firstAttemptAt,
    lockedUntil: nextCount >= MAX_FAILED_ATTEMPTS ? now + LOGIN_WINDOW_MS : undefined,
  })
}

export function clearStaffLoginFailures(email: string, ip: string) {
  staffLoginAttempts.delete(getLoginKey(email, ip))
}
