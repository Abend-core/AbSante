import { ref, shallowRef } from 'vue'

/** Événement non standard émis par Chrome, Edge et les navigateurs Android quand l'application
 *  peut être installée. `prompt()` ouvre la fenêtre d'installation du navigateur. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** L'événement arrive parfois avant que l'interface soit montée : on l'écoute dès le démarrage
 *  (voir main.ts) et on le conserve ici jusqu'à ce que l'utilisateur clique sur « Installer ». */
export const deferredPrompt = shallowRef<BeforeInstallPromptEvent | null>(null)
export const installed = ref(false)

/** Vrai quand l'application tourne déjà installée (fenêtre autonome), sur tous les navigateurs. */
export function isStandalone(win: Window = window): boolean {
  return (
    win.matchMedia?.('(display-mode: standalone)').matches === true ||
    (win.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** iPhone / iPad : Safari n'a pas de bouton d'installation programmable, il faut passer par
 *  « Partager » puis « Sur l'écran d'accueil ». */
export function isIos(nav: Pick<Navigator, 'userAgent' | 'platform' | 'maxTouchPoints'> = navigator): boolean {
  return /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)
}

export function listenForInstallPrompt(win: Window = window): () => void {
  installed.value = isStandalone(win)

  const onPrompt = (event: Event) => {
    // On garde la main sur le moment de l'invite (bouton du header) au lieu de la mini-barre du navigateur.
    event.preventDefault()
    deferredPrompt.value = event as BeforeInstallPromptEvent
  }
  const onInstalled = () => {
    installed.value = true
    deferredPrompt.value = null
  }

  win.addEventListener('beforeinstallprompt', onPrompt)
  win.addEventListener('appinstalled', onInstalled)
  return () => {
    win.removeEventListener('beforeinstallprompt', onPrompt)
    win.removeEventListener('appinstalled', onInstalled)
  }
}
