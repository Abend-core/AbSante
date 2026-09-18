import { computed } from 'vue'
import { deferredPrompt, installed, isIos } from '../pwa/installPrompt'

export type InstallMode =
  /** Rien à proposer : navigateur sans installation possible (ex: Firefox bureau) ou invite pas encore disponible. */
  | 'unavailable'
  /** Le navigateur peut ouvrir sa fenêtre d'installation en un clic. */
  | 'prompt'
  /** iPhone / iPad : instructions « Partager → Sur l'écran d'accueil ». */
  | 'ios'
  /** Déjà installée. */
  | 'installed'

export type InstallResult = 'accepted' | 'dismissed' | 'unavailable'

/** État et action d'installation de l'application (PWA), pour le bouton du header. */
export function usePwaInstall() {
  const mode = computed<InstallMode>(() => {
    if (installed.value) return 'installed'
    if (deferredPrompt.value) return 'prompt'
    if (isIos()) return 'ios'
    return 'unavailable'
  })

  async function install(): Promise<InstallResult> {
    const event = deferredPrompt.value
    if (!event) return 'unavailable'
    // Une invite ne peut servir qu'une fois : on la libère avant de la montrer.
    deferredPrompt.value = null
    try {
      await event.prompt()
      const { outcome } = await event.userChoice
      if (outcome === 'accepted') installed.value = true
      return outcome
    } catch {
      return 'unavailable'
    }
  }

  return { mode, install }
}
