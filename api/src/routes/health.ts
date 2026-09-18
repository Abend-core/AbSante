import type { FastifyInstance } from 'fastify'
import type { PraticienRepository } from '../fiche/repository.js'

/** Santé du service, base comprise : sert aux healthchecks Docker / du reverse proxy. */
export function healthRoutes(app: FastifyInstance, repository: PraticienRepository) {
  app.get('/health', async (_request, reply) => {
    try {
      await repository.ping()
      return { status: 'ok' }
    } catch {
      return reply.code(503).send({ status: 'degraded', database: 'indisponible' })
    }
  })
}
