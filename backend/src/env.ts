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
})

export const env = envSchema.parse(process.env)
