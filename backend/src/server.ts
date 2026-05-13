import path from 'node:path'
import fs from 'node:fs'
import { readFile } from 'node:fs/promises'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { ZodError } from 'zod'
import { env } from './env'
import { authRoutes } from './routes/auth'
import { appointmentRoutes } from './routes/appointments'
import { careTypeRoutes } from './routes/care-types'
import { dashboardRoutes } from './routes/dashboard'
import { feedbackRoutes } from './routes/feedback'
import { healthNoteRoutes } from './routes/health-notes'
import { ownerAuthRoutes } from './routes/owner-auth'
import { ownerPetRoutes } from './routes/owner-pets'
import { ownerShareRoutes } from './routes/owner-share'
import { petRoutes } from './routes/pets'
import { preventiveRecordRoutes } from './routes/preventive-records'
import { publicShareRoutes } from './routes/public-share'
import { staffRoutes } from './routes/staff'
import { visitRoutes } from './routes/visits'

export function buildServer() {
  const app = Fastify({
    logger: true,
  })
  const uploadsRoot = path.resolve(__dirname, '../../uploads')
  const webRoot = path.resolve(__dirname, '../../web/dist')
  const webIndexPath = path.join(webRoot, 'index.html')
  const storageOrigin = env.SUPABASE_URL ? new URL(env.SUPABASE_URL).origin : null
  const corsOrigin =
    env.CORS_ORIGIN === '*'
      ? true
      : env.CORS_ORIGIN.split(',')
          .map((origin) => origin.trim())
          .filter(Boolean)

  app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        imgSrc: storageOrigin ? ["'self'", 'data:', storageOrigin] : ["'self'", 'data:'],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })

  app.register(cors, {
    origin: corsOrigin,
    credentials: true,
  })

  app.register(cookie, {
    secret: env.COOKIE_SECRET,
  })

  app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: '30d' },
  })
  app.register(multipart, {
    limits: {
      files: 1,
      fileSize: 5 * 1024 * 1024,
    },
  })
  app.register(fastifyStatic, {
    root: uploadsRoot,
    prefix: '/uploads/',
    decorateReply: false,
  })

  app.get('/api/health', async () => ({ status: 'ok' }))
  app.register(authRoutes, { prefix: '/api/auth' })
  app.register(ownerAuthRoutes, { prefix: '/api/owner-auth' })
  app.register(appointmentRoutes, { prefix: '/api' })
  app.register(dashboardRoutes, { prefix: '/api' })
  app.register(feedbackRoutes, { prefix: '/api' })
  app.register(healthNoteRoutes, { prefix: '/api' })
  app.register(ownerPetRoutes, { prefix: '/api/owner' })
  app.register(ownerShareRoutes, { prefix: '/api/owner' })
  app.register(publicShareRoutes, { prefix: '/api' })
  app.register(staffRoutes, { prefix: '/api' })
  app.register(careTypeRoutes, { prefix: '/api' })
  app.register(petRoutes, { prefix: '/api' })
  app.register(visitRoutes, { prefix: '/api' })
  app.register(preventiveRecordRoutes, { prefix: '/api' })

  if ((env.NODE_ENV === 'production' || env.SERVE_WEB_APP) && fs.existsSync(webIndexPath)) {
    app.register(fastifyStatic, {
      root: webRoot,
      prefix: '/',
      decorateReply: false,
    })

    app.setNotFoundHandler(async (request, reply) => {
      const url = request.raw.url ?? ''
      if (url.startsWith('/api') || url.startsWith('/uploads')) {
        return reply.code(404).send({ message: 'Not found.' })
      }

      const indexHtml = await readFile(webIndexPath, 'utf8')
      return reply.type('text/html; charset=utf-8').send(indexHtml)
    })
  }

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        message: 'Invalid request payload.',
        issues: error.issues,
      })
    }

    const prismaCode =
      typeof error === 'object' && error !== null ? Reflect.get(error, 'code') : undefined
    if (prismaCode === 'P2002') {
      return reply.code(409).send({
        message: 'A record with the same unique value already exists.',
      })
    }

    if (error instanceof Error && error.message === 'Invalid date value.') {
      return reply.code(400).send({ message: error.message })
    }

    const fastifyCode =
      typeof error === 'object' && error !== null ? Reflect.get(error, 'code') : undefined
    if (fastifyCode === 'FST_REQ_FILE_TOO_LARGE') {
      return reply.code(400).send({ message: 'Image must be 5MB or smaller.' })
    }

    request.log.error(error)
    return reply.code(500).send({ message: 'Unexpected server error.' })
  })

  return app
}
