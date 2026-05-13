import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { env } from '../env'

const localAvatarDir = path.resolve(__dirname, '../../../uploads/pets/avatar')
const storageAvatarPrefix = 'supabase-storage://'
const localAvatarPrefix = '/uploads/pets/avatar/'

let supabaseClient: SupabaseClient | null = null

function isSupabaseStorageConfigured() {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)
}

function getSupabaseClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase Storage is not configured.')
  }

  if (!supabaseClient) {
    supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }

  return supabaseClient
}

function createStorageAvatarRef(objectPath: string) {
  return `${storageAvatarPrefix}${env.SUPABASE_STORAGE_BUCKET}/${objectPath}`
}

function parseStorageAvatarRef(value: string) {
  if (!value.startsWith(storageAvatarPrefix)) {
    return null
  }

  const rest = value.slice(storageAvatarPrefix.length)
  const separatorIndex = rest.indexOf('/')
  if (separatorIndex <= 0) {
    return null
  }

  return {
    bucket: rest.slice(0, separatorIndex),
    path: rest.slice(separatorIndex + 1),
  }
}

function createLocalAvatarFilename(scope: string) {
  return `${scope}-${Date.now()}-${crypto.randomUUID()}.webp`
}

async function ensureLocalAvatarDir() {
  await fs.mkdir(localAvatarDir, { recursive: true })
}

async function processAvatarImage(buffer: Buffer) {
  return sharp(buffer)
    .rotate()
    .resize(512, 512, { fit: 'cover', position: 'centre' })
    .webp({ quality: 82 })
    .toBuffer()
}

export function isAcceptedPetAvatarValue(value: string) {
  return value === '' || value.startsWith(localAvatarPrefix) || parseStorageAvatarRef(value) !== null
}

export async function storePetAvatar(input: { buffer: Buffer; scope: 'clinic' | 'owner'; scopeId: string }) {
  const processed = await processAvatarImage(input.buffer)
  const filename = createLocalAvatarFilename(`${input.scope}-${input.scopeId}`)

  if (isSupabaseStorageConfigured()) {
    const objectPath = `${input.scope}/${input.scopeId}/${filename}`
    const { error } = await getSupabaseClient()
      .storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .upload(objectPath, processed, {
        contentType: 'image/webp',
        upsert: false,
      })

    if (error) {
      throw error
    }

    return createStorageAvatarRef(objectPath)
  }

  await ensureLocalAvatarDir()
  await fs.writeFile(path.join(localAvatarDir, filename), processed)
  return `${localAvatarPrefix}${filename}`
}

export async function deleteStoredPetAvatar(avatarUrl: string | null | undefined) {
  if (!avatarUrl) {
    return
  }

  const storageRef = parseStorageAvatarRef(avatarUrl)
  if (storageRef) {
    const { error } = await getSupabaseClient().storage.from(storageRef.bucket).remove([storageRef.path])
    if (error) {
      throw error
    }
    return
  }

  if (!avatarUrl.startsWith(localAvatarPrefix)) {
    return
  }

  const filename = path.basename(avatarUrl)
  if (!filename) {
    return
  }

  await fs.rm(path.join(localAvatarDir, filename), { force: true })
}

export async function resolvePetAvatarUrl(avatarUrl: string | null | undefined) {
  if (!avatarUrl) {
    return null
  }

  const storageRef = parseStorageAvatarRef(avatarUrl)
  if (!storageRef) {
    return avatarUrl
  }

  const { data, error } = await getSupabaseClient()
    .storage
    .from(storageRef.bucket)
    .createSignedUrl(storageRef.path, env.SUPABASE_STORAGE_SIGNED_URL_SECONDS)

  if (error) {
    throw error
  }

  return data.signedUrl
}
