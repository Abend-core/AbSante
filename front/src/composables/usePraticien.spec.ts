import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import type { Fiche } from '../types/fiche'
import { usePraticien } from './usePraticien'

const FICHE: Fiche = {
  id: '810006881261', identifiantPP: '10006881261', typeIdentifiant: '8', civilite: 'Madame', civiliteExercice: null,
  nom: 'BRUN', prenom: 'SOLENNE', activites: [], savoirFaire: [], diplomes: [], misAJourLe: null,
}

const respond = (status: number, body: unknown = FICHE) =>
  Promise.resolve({ status, ok: status >= 200 && status < 300, json: () => Promise.resolve(body) })

function run(id: string | (() => string), fetchImpl: (url: string) => Promise<unknown>) {
  vi.stubGlobal('fetch', vi.fn(fetchImpl))
  const scope = effectScope()
  const result = scope.run(() => usePraticien(id))!
  return { ...result, stop: () => scope.stop() }
}

const settle = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve()
  await nextTick()
}

afterEach(() => vi.unstubAllGlobals())

describe('usePraticien', () => {
  it('passe de "loading" à "ready" avec la fiche', async () => {
    const { state } = run('810006881261', () => respond(200))
    expect(state.value.status).toBe('loading')
    await settle()
    expect(state.value).toEqual({ status: 'ready', fiche: FICHE })
    expect(fetch).toHaveBeenCalledWith('/api/praticiens/810006881261')
  })

  it("encode l'identifiant dans l'URL (aucune injection de chemin ou de requête)", async () => {
    run('81/../x?y=1', () => respond(404))
    await settle()
    expect(fetch).toHaveBeenCalledWith('/api/praticiens/81%2F..%2Fx%3Fy%3D1')
  })

  it.each([
    [404, 'not-found'],
    [400, 'not-found'],
    [503, 'unavailable'],
    [500, 'unavailable'],
    [502, 'unavailable'],
    [429, 'error'],
    [403, 'error'],
  ])('HTTP %i -> %s', async (status, expected) => {
    const { state } = run('810006881261', () => respond(status))
    await settle()
    expect(state.value.status).toBe(expected)
  })

  it('une coupure réseau donne "unavailable" (jamais une exception non gérée)', async () => {
    const { state } = run('810006881261', () => Promise.reject(new TypeError('Failed to fetch')))
    await settle()
    expect(state.value.status).toBe('unavailable')
  })

  it('un corps de réponse illisible donne "error"', async () => {
    const { state } = run('810006881261', () =>
      Promise.resolve({ status: 200, ok: true, json: () => Promise.reject(new SyntaxError('Unexpected token <')) }),
    )
    await settle()
    expect(state.value.status).toBe('error')
  })

  it('reload permet de réessayer après une panne et revient à "loading" pendant le chargement', async () => {
    let down = true
    const { state, reload } = run('810006881261', () => (down ? respond(503) : respond(200)))
    await settle()
    expect(state.value.status).toBe('unavailable')

    down = false
    const pending = reload()
    expect(state.value.status).toBe('loading')
    await pending
    expect(state.value.status).toBe('ready')
  })

  it("recharge quand l'identifiant change, et ignore une réponse tardive de l'ancien identifiant", async () => {
    const id = ref('810000000001')
    const resolvers: Record<string, (v: unknown) => void> = {}
    const { state } = run(() => id.value, (url) => new Promise((resolve) => (resolvers[url] = resolve)))
    await settle()

    id.value = '810000000002'
    await settle()

    // La réponse du 2e arrive d'abord, puis celle (périmée) du 1er
    resolvers['/api/praticiens/810000000002']!(await respond(200, { ...FICHE, id: '810000000002' }))
    await settle()
    resolvers['/api/praticiens/810000000001']!(await respond(200, { ...FICHE, id: '810000000001' }))
    await settle()

    expect(state.value.status === 'ready' && state.value.fiche.id).toBe('810000000002')
  })
})
