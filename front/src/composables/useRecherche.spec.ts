import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useRecherche } from './useRecherche'

const RESULTAT = { id: '810000000001', civiliteExercice: 'Docteur', nom: 'MARTIN', prenom: 'PAUL', professions: ['Médecin'], commune: 'Lyon', codePostal: '69001' }
const reponse = (resultats: unknown[], tronque = false) => ({ ok: true, json: () => Promise.resolve({ resultats, tronque }) })

describe('useRecherche', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('n\'interroge pas l\'API en dessous de 3 caractères', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const r = useRecherche()
    r.query.value = 'ma'
    await nextTick()
    await vi.advanceTimersByTimeAsync(1000)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(r.status.value).toBe('idle')
  })

  it('attend la fin de la frappe : une seule requête pour « mar », « mart », « martin »', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(reponse([RESULTAT])))
    vi.stubGlobal('fetch', fetchMock)
    const r = useRecherche({ delayMs: 250 })
    for (const texte of ['mar', 'mart', 'martin']) {
      r.query.value = texte
      await nextTick()
      await vi.advanceTimersByTimeAsync(100)
    }
    expect(r.status.value).toBe('loading')
    await vi.advanceTimersByTimeAsync(300)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/recherche?q=martin')
    expect(r.status.value).toBe('done')
    expect(r.resultats.value).toEqual([RESULTAT])
  })

  it('encode la saisie (espaces, apostrophes, accents) et la débarrasse des espaces de bord', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(reponse([])))
    vi.stubGlobal('fetch', fetchMock)
    const r = useRecherche()
    r.query.value = "  d'aubigné jean "
    await nextTick()
    await vi.advanceTimersByTimeAsync(300)
    expect(fetchMock).toHaveBeenCalledWith("/api/recherche?q=d'aubign%C3%A9%20jean")
  })

  it('transmet le drapeau « tronqué »', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(reponse([RESULTAT], true))))
    const r = useRecherche()
    r.query.value = 'martin'
    await nextTick()
    await vi.advanceTimersByTimeAsync(300)
    expect(r.tronque.value).toBe(true)
  })

  it('ignore une réponse tardive qui ne correspond plus à ce qui est tapé', async () => {
    let releaseLente: (v: unknown) => void = () => {}
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => (releaseLente = resolve)))
      .mockImplementationOnce(() => Promise.resolve(reponse([{ ...RESULTAT, nom: 'DUPONT' }])))
    vi.stubGlobal('fetch', fetchMock)
    const r = useRecherche()

    r.query.value = 'martin'
    await nextTick()
    await vi.advanceTimersByTimeAsync(300) // 1re requête partie, pas encore de réponse
    r.query.value = 'dupont'
    await nextTick()
    await vi.advanceTimersByTimeAsync(300) // 2e requête, répond tout de suite
    expect(r.resultats.value[0]?.nom).toBe('DUPONT')

    releaseLente(reponse([RESULTAT])) // la réponse « martin » arrive en retard
    await vi.advanceTimersByTimeAsync(10)
    expect(r.resultats.value[0]?.nom).toBe('DUPONT')
  })

  it('efface les résultats quand on efface la saisie', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(reponse([RESULTAT]))))
    const r = useRecherche()
    r.query.value = 'martin'
    await nextTick()
    await vi.advanceTimersByTimeAsync(300)
    r.query.value = ''
    await nextTick()
    expect(r.resultats.value).toEqual([])
    expect(r.status.value).toBe('idle')
  })

  it.each([
    ['une erreur HTTP (429 trop de requêtes, 503...)', () => Promise.resolve({ ok: false, json: () => Promise.resolve({}) })],
    ['une panne réseau', () => Promise.reject(new TypeError('Failed to fetch'))],
  ])('passe en erreur sur %s, sans résultats périmés', async (_nom, impl) => {
    vi.stubGlobal('fetch', vi.fn(impl))
    const r = useRecherche()
    r.resultats.value = [RESULTAT]
    r.query.value = 'martin'
    await nextTick()
    await vi.advanceTimersByTimeAsync(300)
    expect(r.status.value).toBe('error')
    expect(r.resultats.value).toEqual([])
  })
})
