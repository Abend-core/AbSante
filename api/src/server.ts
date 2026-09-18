import { ConfigError, loadConfig } from './config.js'
import { startServer } from './start.js'

async function main() {
  let config
  try {
    config = loadConfig()
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(`Configuration invalide : ${err.message}`)
      process.exit(1)
    }
    throw err
  }

  const server = await startServer(config)

  let stopping = false
  const stop = (signal: string) => {
    if (stopping) return
    stopping = true
    server.app.log.info({ signal }, 'arrêt demandé')
    // Filet de sécurité : si l'arrêt propre bloque, on sort quand même.
    const force = setTimeout(() => process.exit(1), 10_000)
    force.unref()
    server.close().then(
      () => process.exit(0),
      () => process.exit(1),
    )
  }
  process.on('SIGINT', () => stop('SIGINT'))
  process.on('SIGTERM', () => stop('SIGTERM'))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
