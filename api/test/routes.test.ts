import type { FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../src/app.js'
import { RepositoryUnavailableError } from '../src/fiche/repository.js'
import type { PraticienRepository } from '../src/fiche/repository.js'
import type { Fiche } from '../src/fiche/types.js'

const FICHE: Fiche = {
  id: '810006881261', identifiantPP: '10006881261', typeIdentifiant: '8', civilite: 'Madame', civiliteExercice: null,
  nom: 'BRUN', prenom: 'SOLENNE', activites: [], savoirFaire: [], diplomes: [], misAJourLe: null,
}

function fakeRepository(overrides: Partial<PraticienRepository> = {}): PraticienRepository {
  return {
    findFiche: vi.fn(async (id: string) => (id === FICHE.id ? FICHE : null)),
    rechercher: vi.fn(async () => ({ resultats: [], tronque: false })),
    ping: vi.fn(async () => {}),
    ...overrides,
  }
}

let app: FastifyInstance
afterEach(async () => {
  await app?.close()
})

describe('GET /api/praticiens/:id', () => {
  it('renvoie la fiche avec un cache court', async () => {
    app = await buildApp({ repository: fakeRepository() })
    const res = await app.inject('/api/praticiens/810006881261')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual(FICHE)
    expect(res.headers['cache-control']).toBe('public, max-age=300')
  })

  it('renvoie 404 avec un code stable pour un identifiant inconnu (et ne met pas l\'erreur en cache)', async () => {
    app = await buildApp({ repository: fakeRepository() })
    const res = await app.inject('/api/praticiens/810000000000')
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('PRATICIEN_INTROUVABLE')
    expect(res.headers['cache-control']).toBe('no-store')
  })

  it.each(['abc', '12345', '1234567890123456', '8100%2068', '1%27%20OR%20%271%27=%271', '81000688126a'])(
    'refuse l\'identifiant invalide %s (400) sans interroger la base',
    async (id) => {
      const repository = fakeRepository()
      app = await buildApp({ repository })
      const res = await app.inject(`/api/praticiens/${id}`)
      expect(res.statusCode).toBe(400)
      expect(res.json().error.code).toBe('REQUETE_INVALIDE')
      expect(repository.findFiche).not.toHaveBeenCalled()
    },
  )

  it('répond 503 + Retry-After quand la base est indisponible', async () => {
    const repository = fakeRepository({ findFiche: vi.fn().mockRejectedValue(new RepositoryUnavailableError(new Error('ECONNREFUSED 10.0.0.5:5432'))) })
    app = await buildApp({ repository })
    const res = await app.inject('/api/praticiens/810006881261')
    expect(res.statusCode).toBe(503)
    expect(res.headers['retry-after']).toBe('5')
    expect(res.json().error.code).toBe('SERVICE_INDISPONIBLE')
    expect(res.body).not.toContain('10.0.0.5') // aucun détail d'infrastructure ne fuit
  })

  it('répond 500 générique sans révéler le détail d\'une erreur inattendue', async () => {
    const repository = fakeRepository({ findFiche: vi.fn().mockRejectedValue(new Error('relation "rpps.secret" does not exist')) })
    app = await buildApp({ repository })
    const res = await app.inject('/api/praticiens/810006881261')
    expect(res.statusCode).toBe(500)
    expect(res.json().error.code).toBe('ERREUR_INTERNE')
    expect(res.body).not.toContain('secret')
  })

  it('répond 429 au-delà de la limite de requêtes, sauf pour /health', async () => {
    app = await buildApp({ repository: fakeRepository(), rateLimitMax: 3 })
    for (let i = 0; i < 3; i++) expect((await app.inject('/api/praticiens/810006881261')).statusCode).toBe(200)
    const limited = await app.inject('/api/praticiens/810006881261')
    expect(limited.statusCode).toBe(429)
    expect(limited.json().error.code).toBe('TROP_DE_REQUETES')
    expect((await app.inject('/health')).statusCode).toBe(200)
  })
})

describe('GET /api/recherche', () => {
  const RESULTAT = { id: '810006881261', civiliteExercice: null, nom: 'BRUN', prenom: 'SOLENNE', professions: ['Infirmier'], commune: 'Montpellier', codePostal: '34000' }

  it('renvoie les résultats, sans mise en cache (la requête change à chaque frappe)', async () => {
    const repository = fakeRepository({ rechercher: vi.fn(async () => ({ resultats: [RESULTAT], tronque: true })) })
    app = await buildApp({ repository })
    const res = await app.inject('/api/recherche?q=brun%20solenne')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ resultats: [RESULTAT], tronque: true })
    expect(res.headers['cache-control']).toBe('no-store')
    expect(repository.rechercher).toHaveBeenCalledWith('brun solenne')
  })

  it.each(['', 'ab', ''.padEnd(81, 'a')])('refuse la recherche %j (trop courte ou trop longue) sans interroger la base', async (q) => {
    const repository = fakeRepository()
    app = await buildApp({ repository })
    const res = await app.inject(`/api/recherche?q=${q}`)
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('REQUETE_INVALIDE')
    expect(repository.rechercher).not.toHaveBeenCalled()
  })

  it('refuse une requête sans paramètre q', async () => {
    app = await buildApp({ repository: fakeRepository() })
    expect((await app.inject('/api/recherche')).statusCode).toBe(400)
  })

  it('répond 503 quand la base est indisponible', async () => {
    const repository = fakeRepository({ rechercher: vi.fn().mockRejectedValue(new RepositoryUnavailableError(new Error('down'))) })
    app = await buildApp({ repository })
    expect((await app.inject('/api/recherche?q=martin')).statusCode).toBe(503)
  })
})

describe('GET /health', () => {
  it('est ok quand la base répond', async () => {
    app = await buildApp({ repository: fakeRepository() })
    const res = await app.inject('/health')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok' })
  })

  it('passe en 503 quand la base ne répond pas', async () => {
    app = await buildApp({ repository: fakeRepository({ ping: vi.fn().mockRejectedValue(new Error('down')) }) })
    const res = await app.inject('/health')
    expect(res.statusCode).toBe(503)
    expect(res.json().status).toBe('degraded')
  })
})

describe('routes inconnues', () => {
  it('répondent 404 au même format JSON', async () => {
    app = await buildApp({ repository: fakeRepository() })
    const res = await app.inject('/api/nimporte-quoi')
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('ROUTE_INCONNUE')
  })
})
