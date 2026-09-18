import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { loadConfig } from '../src/config.js'
import type { Fiche } from '../src/fiche/types.js'
import { importRpps } from '../src/import/importer.js'
import { startServer } from '../src/start.js'
import { TEST_DATABASE_URL, dropSchemas, uniqueSchema } from './helpers/db.js'
import { FIXTURE, IDS, writeRppsFiles } from './helpers/rpps-files.js'

const schema = uniqueSchema('srv')
const configFor = (databaseUrl: string) =>
  loadConfig({ DATABASE_URL: databaseUrl, DB_SCHEMA: schema, HOST: '127.0.0.1', PORT: '0', LOG_LEVEL: 'silent' })

beforeAll(async () => {
  const { files } = await writeRppsFiles(FIXTURE)
  await importRpps({ databaseUrl: TEST_DATABASE_URL, schema, files })
})
afterAll(() => dropSchemas(schema))

describe('startServer', () => {
  it('sert la fiche d\'un praticien de bout en bout (HTTP -> Fastify -> Postgres)', async () => {
    const server = await startServer(configFor(TEST_DATABASE_URL))
    try {
      const health = await fetch(`${server.url}/health`)
      expect(health.status).toBe(200)

      const res = await fetch(`${server.url}/api/praticiens/${IDS.SOLENNE_ANTAGENE}`)
      expect(res.status).toBe(200)
      const fiche = (await res.json()) as Fiche
      expect(fiche.nom).toBe('BRUN')
      expect(fiche.activites[0]?.structure?.raisonSociale).toBe('ANTAGENE')

      expect((await fetch(`${server.url}/api/praticiens/810000000000`)).status).toBe(404)
    } finally {
      await server.close()
    }
  })

  it('s\'arrête proprement (et deux fois de suite sans erreur), puis ne répond plus', async () => {
    const server = await startServer(configFor(TEST_DATABASE_URL))
    await server.close()
    await expect(server.close()).resolves.toBeUndefined()
    await expect(fetch(`${server.url}/health`)).rejects.toThrow()
  })

  it('démarre même si la base est injoignable, répond 503, puis se rétablit quand la base revient', async () => {
    // Base "injoignable" simulée par un mauvais mot de passe : le serveur doit rester debout.
    const bad = TEST_DATABASE_URL.replace(/:\/\/([^:]+):[^@]+@/, '://$1:mauvais@')
    const down = await startServer(configFor(bad))
    try {
      expect((await fetch(`${down.url}/health`)).status).toBe(503)
      const res = await fetch(`${down.url}/api/praticiens/${IDS.DR_MARTIN}`)
      expect(res.status).toBe(503)
      expect(res.headers.get('retry-after')).toBe('5')
    } finally {
      await down.close()
    }
    // Même code, bons identifiants : tout refonctionne
    const up = await startServer(configFor(TEST_DATABASE_URL))
    try {
      expect((await fetch(`${up.url}/api/praticiens/${IDS.DR_MARTIN}`)).status).toBe(200)
    } finally {
      await up.close()
    }
  })

  it('échoue proprement (et libère le pool) si le port est déjà pris', async () => {
    const first = await startServer(configFor(TEST_DATABASE_URL))
    try {
      const port = new URL(first.url).port
      const config = { ...configFor(TEST_DATABASE_URL), port: Number(port) }
      await expect(startServer(config)).rejects.toThrow(/EADDRINUSE|address already in use/)
    } finally {
      await first.close()
    }
  })
})
