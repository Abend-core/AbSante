import Fastify from 'fastify'
import type { FastifyInstance, FastifyServerOptions } from 'fastify'
import rateLimit from '@fastify/rate-limit'
import { RepositoryUnavailableError } from './fiche/repository.js'
import type { PraticienRepository } from './fiche/repository.js'
import { healthRoutes } from './routes/health.js'
import { praticiensRoutes } from './routes/praticiens.js'

export interface AppDeps {
  repository: PraticienRepository
  logger?: FastifyServerOptions['logger']
  rateLimitMax?: number
  trustProxy?: boolean
}

function errorBody(code: string, message: string) {
  return { error: { code, message } }
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: deps.logger ?? false, trustProxy: deps.trustProxy ?? false })

  await app.register(rateLimit, {
    max: deps.rateLimitMax ?? 120,
    timeWindow: '1 minute',
    allowList: (request) => request.url === '/health',
  })

  // Toutes les erreurs sortent au même format { error: { code, message } } et ne
  // révèlent jamais de détail interne (requête SQL, pile d'appels...).
  app.setErrorHandler((err: Error & { statusCode?: number; validation?: unknown }, request, reply) => {
    reply.header('Cache-Control', 'no-store')
    if (err.validation) {
      return reply.code(400).send(errorBody('REQUETE_INVALIDE', 'Identifiant de praticien invalide.'))
    }
    if (err.statusCode === 429) {
      return reply.code(429).send(errorBody('TROP_DE_REQUETES', 'Trop de requêtes, réessayez dans un instant.'))
    }
    if (err instanceof RepositoryUnavailableError) {
      request.log.error({ err }, 'base de données indisponible')
      return reply.code(503).header('Retry-After', '5').send(
        errorBody('SERVICE_INDISPONIBLE', 'Le service est momentanément indisponible, réessayez dans un instant.'),
      )
    }
    request.log.error({ err }, 'erreur inattendue')
    return reply.code(500).send(errorBody('ERREUR_INTERNE', 'Une erreur est survenue.'))
  })

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).header('Cache-Control', 'no-store').send(errorBody('ROUTE_INCONNUE', 'Route inconnue.'))
  })

  healthRoutes(app, deps.repository)
  praticiensRoutes(app, deps.repository)
  return app
}
