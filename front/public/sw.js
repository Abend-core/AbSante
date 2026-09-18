/* Service worker d'AbSante.
 *
 * Volontairement minimal : il rend l'application installable et affiche une page claire
 * quand il n'y a pas de connexion. Il ne met JAMAIS en cache l'API, les données ni les
 * scripts : les fiches de praticiens et la carte sont toujours servies fraîches, et une
 * nouvelle version de l'application n'est jamais masquée par un ancien cache. */
const CACHE = 'absante-offline-v1'
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      // Installer hors ligne ne doit pas faire échouer le service worker.
      .catch(() => {})
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  // Seules les navigations (ouverture ou rechargement d'une page) ont un repli hors ligne :
  // tout le reste (API, données, scripts, tuiles de carte) passe directement au réseau.
  if (request.method !== 'GET' || request.mode !== 'navigate') return

  event.respondWith(
    fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) ?? Response.error()),
  )
})
