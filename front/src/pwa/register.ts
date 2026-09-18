/** Enregistre le service worker (`public/sw.js`) une fois la page chargée, pour ne pas
 *  ralentir son affichage. Sans effet dans un navigateur qui ne gère pas les service workers ;
 *  un échec d'enregistrement ne doit jamais gêner l'application. */
export function registerServiceWorker(
  nav: { serviceWorker?: { register: (url: string) => Promise<unknown> } } = navigator,
  win: Pick<Window, 'addEventListener'> = window,
): void {
  const container = nav.serviceWorker
  if (!container) return
  win.addEventListener('load', () => {
    container.register('/sw.js').catch((err) => console.warn("Service worker non enregistré :", err))
  })
}
