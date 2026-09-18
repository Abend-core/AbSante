import type { FastifyInstance } from 'fastify'
import type { PraticienRepository } from '../fiche/repository.js'

/** Identifiant national RPPS/ADELI : chiffres uniquement (ex: 810006881261). */
export const ID_PATTERN = '^[0-9]{6,15}$'

export function praticiensRoutes(app: FastifyInstance, repository: PraticienRepository) {
  app.get<{ Params: { id: string } }>(
    '/api/praticiens/:id',
    { schema: { params: { type: 'object', required: ['id'], properties: { id: { type: 'string', pattern: ID_PATTERN } } } } },
    async (request, reply) => {
      const fiche = await repository.findFiche(request.params.id)
      if (!fiche) {
        return reply.code(404).header('Cache-Control', 'no-store').send({
          error: { code: 'PRATICIEN_INTROUVABLE', message: 'Aucun praticien ne correspond à cet identifiant.' },
        })
      }
      // Les données ne changent qu'à l'import quotidien : un cache court suffit à
      // absorber les rechargements de page sans jamais afficher de données périmées longtemps.
      return reply.header('Cache-Control', 'public, max-age=300').send(fiche)
    },
  )
}
