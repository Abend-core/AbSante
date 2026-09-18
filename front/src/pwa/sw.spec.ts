import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

// `public/sw.js` est un script classique (pas un module) : on l'exécute dans un environnement
// simulé de service worker, en capturant les écouteurs qu'il enregistre.
const source = readFileSync(resolve(__dirname, '../../public/sw.js'), 'utf8')
const ERROR_RESPONSE = { error: true }

type Handler = (event: Record<string, unknown>) => void

function loadServiceWorker(options: { caches?: Record<string, unknown>; fetch?: () => Promise<unknown> } = {}) {
  const handlers: Record<string, Handler> = {}
  const self = {
    addEventListener: (type: string, cb: Handler) => (handlers[type] = cb),
    skipWaiting: vi.fn().mockResolvedValue(undefined),
    clients: { claim: vi.fn().mockResolvedValue(undefined) },
  }
  const cache = { add: vi.fn().mockResolvedValue(undefined) }
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    keys: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(true),
    match: vi.fn().mockResolvedValue(undefined),
    ...options.caches,
  }
  const fetchFn = options.fetch ?? vi.fn().mockResolvedValue('network-response')
  new Function('self', 'caches', 'fetch', 'Response', source)(self, caches, fetchFn, { error: () => ERROR_RESPONSE })
  return { handlers, self, caches, cache, fetch: fetchFn }
}

function lifecycleEvent() {
  const waits: Promise<unknown>[] = []
  return { event: { waitUntil: (p: Promise<unknown>) => waits.push(p) }, done: () => Promise.all(waits) }
}

function fetchEvent(request: Record<string, unknown>) {
  let response: Promise<unknown> | undefined
  return {
    event: { request, respondWith: (p: Promise<unknown>) => (response = p) },
    response: () => response,
  }
}

describe('service worker', () => {
  it("met en cache la page hors ligne à l'installation et s'active sans attendre", async () => {
    const sw = loadServiceWorker()
    const { event, done } = lifecycleEvent()
    sw.handlers.install!(event)
    await done()
    expect(sw.cache.add).toHaveBeenCalledWith('/offline.html')
    expect(sw.self.skipWaiting).toHaveBeenCalled()
  })

  it("s'installe même si la mise en cache échoue (installation hors ligne)", async () => {
    const sw = loadServiceWorker()
    sw.cache.add.mockRejectedValue(new Error('offline'))
    const { event, done } = lifecycleEvent()
    sw.handlers.install!(event)
    await expect(done()).resolves.toBeDefined()
    expect(sw.self.skipWaiting).toHaveBeenCalled()
  })

  it("à l'activation, supprime les anciens caches, garde le courant et prend le contrôle des onglets", async () => {
    const sw = loadServiceWorker({ caches: { keys: vi.fn().mockResolvedValue(['absante-offline-v0', 'absante-offline-v1', 'autre']) } })
    const { event, done } = lifecycleEvent()
    sw.handlers.activate!(event)
    await done()
    expect(sw.caches.delete).toHaveBeenCalledTimes(2)
    expect(sw.caches.delete).toHaveBeenCalledWith('absante-offline-v0')
    expect(sw.caches.delete).toHaveBeenCalledWith('autre')
    expect(sw.caches.delete).not.toHaveBeenCalledWith('absante-offline-v1')
    expect(sw.self.clients.claim).toHaveBeenCalled()
  })

  it('laisse passer une navigation quand le réseau répond', async () => {
    const sw = loadServiceWorker()
    const { event, response } = fetchEvent({ method: 'GET', mode: 'navigate' })
    sw.handlers.fetch!(event)
    await expect(response()).resolves.toBe('network-response')
  })

  it('affiche la page hors ligne quand une navigation échoue faute de réseau', async () => {
    const sw = loadServiceWorker({
      fetch: () => Promise.reject(new TypeError('Failed to fetch')),
      caches: { match: vi.fn().mockResolvedValue('offline-page') },
    })
    const { event, response } = fetchEvent({ method: 'GET', mode: 'navigate' })
    sw.handlers.fetch!(event)
    await expect(response()).resolves.toBe('offline-page')
    expect(sw.caches.match).toHaveBeenCalledWith('/offline.html')
  })

  it("renvoie une erreur réseau franche quand la page hors ligne n'est pas disponible", async () => {
    const sw = loadServiceWorker({ fetch: () => Promise.reject(new TypeError('Failed to fetch')) })
    const { event, response } = fetchEvent({ method: 'GET', mode: 'navigate' })
    sw.handlers.fetch!(event)
    await expect(response()).resolves.toBe(ERROR_RESPONSE)
  })

  it.each([
    ['une requête POST', { method: 'POST', mode: 'navigate' }],
    ["un appel d'API", { method: 'GET', mode: 'cors', url: '/api/praticiens/1' }],
    ['un script', { method: 'GET', mode: 'no-cors', url: '/assets/index.js' }],
    ['des données', { method: 'GET', mode: 'cors', url: '/data/rpps-commune.json' }],
  ])("ne touche jamais à %s (ni cache, ni interception)", (_name, request) => {
    const sw = loadServiceWorker()
    const { event, response } = fetchEvent(request)
    sw.handlers.fetch!(event)
    expect(response()).toBeUndefined()
    expect(sw.caches.open).not.toHaveBeenCalled()
  })
})
