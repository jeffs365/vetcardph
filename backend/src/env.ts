import 'dotenv/config'
import { z } from 'zod'

const booleanEnv = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value
  }

  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true
  }
  if (['0', 'false', 'no', 'off', ''].includes(normalized)) {
    return false
  }

  return value
}, z.boolean())

const envSchema = z.object({
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3001),
  JWT_SECRET: z.string().min(16).default('vetcard-local-dev-secret'),
  COOKIE_SECRET: z.string().min(16).default('vetcard-local-cookie-secret'),
  COOKIE_SECURE: booleanEnv.default(false),
  AUTH_ACCESS_TOKEN_MINUTES: z.coerce.number().int().positive().default(15),
  AUTH_REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(30),
  CORS_ORIGIN: z.string().min(1).default('*'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SERVE_WEB_APP: booleanEnv.default(false),
  ALLOW_CLINIC_REGISTRATION: booleanEnv.optional(),
  OWNER_OTP_DELIVERY_MODE: z.enum(['dev-response', 'disabled', 'philsms']).optional(),
  PHILSMS_API_TOKEN: z.string().min(1).optional(),
  PHILSMS_SENDER_ID: z.string().min(1).max(11).default('PhilSMS'),
  PHILSMS_API_URL: z.string().url().default('https://app.philsms.com/api/v3/sms/send'),
})

const parsedEnv = envSchema.parse(process.env)

export const env = {
  ...parsedEnv,
  ALLOW_CLINIC_REGISTRATION:
    parsedEnv.ALLOW_CLINIC_REGISTRATION ?? (parsedEnv.NODE_ENV !== 'production'),
  OWNER_OTP_DELIVERY_MODE:
    parsedEnv.OWNER_OTP_DELIVERY_MODE ?? (parsedEnv.NODE_ENV === 'production' ? 'disabled' : 'dev-response'),
}
