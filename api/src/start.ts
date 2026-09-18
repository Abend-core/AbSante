import type { FastifyInstance } from 'fastify'
import { buildApp } from './app.js'
import type { Config } from './config.js'
import { createPool } from './db.js'
import { PgPraticienRepository } from './fiche/repository.js'

export interface RunningServer {
  app: FastifyInstance
  /** Adresse effectivement écoutée (utile avec PORT=0). */
  url: string
  /** Arrêt propre : ne prend plus de connexion, termine les requêtes en cours, ferme le pool. */
  close: () => Promise<void>
}

export async function startServer(config: Config): Promise<RunningServer> {
  let logError: (err: Error) => void = () => {}
  const pool = createPool({
    databaseUrl: config.databaseUrl,
    max: config.dbPoolMax,
    statementTimeoutMs: config.dbStatementTimeoutMs,
    onError: (err) => logError(err),
  })
  const app = await buildApp({
    repository: new PgPraticienRepository(pool, config.schema),
    logger: { level: config.logLevel },
    rateLimitMax: config.rateLimitMax,
    trustProxy: config.trustProxy,
  })
  logError = (err) => app.log.error({ err }, 'erreur sur une connexion Postgres inactive')

  try {
    const url = await app.listen({ host: config.host, port: config.port })
    let closing: Promise<void> | null = null
    const close = () => (closing ??= app.close().then(() => pool.end()))
    return { app, url, close }
  } catch (err) {
    await pool.end().catch(() => {})
    throw err
  }
}
