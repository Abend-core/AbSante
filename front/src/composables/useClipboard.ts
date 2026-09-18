import { onScopeDispose, ref } from 'vue'

export type CopyStatus = 'idle' | 'copied' | 'failed'

/** Copie du texte dans le presse-papiers, avec un état affichable (« Copié » pendant un court
 *  instant). Utilise l'API moderne, et retombe sur l'ancienne méthode quand elle est indisponible
 *  (page non sécurisée, vieux navigateur) : copier ne doit pas échouer silencieusement. */
export function useClipboard(resetAfterMs = 1800) {
  const status = ref<CopyStatus>('idle')
  let timer: ReturnType<typeof setTimeout> | undefined

  async function writeText(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return true
      }
    } catch {
      // refusé (permission, contexte non sécurisé) : on tente le repli
    }
    return legacyCopy(text)
  }

  async function copy(text: string): Promise<boolean> {
    const ok = await writeText(text)
    status.value = ok ? 'copied' : 'failed'
    clearTimeout(timer)
    timer = setTimeout(() => (status.value = 'idle'), resetAfterMs)
    return ok
  }

  onScopeDispose(() => clearTimeout(timer))

  return { status, copy }
}

function legacyCopy(text: string): boolean {
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none'
  document.body.appendChild(area)
  area.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    document.body.removeChild(area)
  }
}
