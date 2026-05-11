import { env } from './env'
import { buildServer } from './server'

async function start() {
  const app = buildServer()

  try {
    await app.listen({
      port: env.PORT,
      host: env.HOST,
    })
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

void start()
