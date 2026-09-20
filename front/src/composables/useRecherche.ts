import { getCurrentScope, onScopeDispose, ref, watch } from 'vue'

export interface ResultatRecherche {
  id: string
  civiliteExercice: string | null
  nom: string | null
  prenom: string | null
  professions: string[]
  commune: string | null
  codePostal: string | null
}

export type RechercheStatus = 'idle' | 'loading' | 'done' | 'error'

/** Longueur minimale avant d'interroger l'API (elle refuse en dessous : voir api/src/fiche/recherche.ts). */
export const RECHERCHE_MIN_CARACTERES = 3

/** Recherche de praticien par nom (API `/api/recherche`), déclenchée en tapant, avec un court délai
 *  pour ne pas interroger à chaque lettre. Une réponse qui arrive après une frappe plus récente est
 *  ignorée : l'affichage correspond toujours à ce qui est tapé. */
export function useRecherche({ delayMs = 250 }: { delayMs?: number } = {}) {
  const query = ref('')
  const resultats = ref<ResultatRecherche[]>([])
  /** Vrai s'il y avait plus de résultats que ceux affichés : on invite à préciser. */
  const tronque = ref(false)
  const status = ref<RechercheStatus>('idle')

  let timer: ReturnType<typeof setTimeout> | undefined
  let sequence = 0

  async function run(texte: string) {
    const mine = ++sequence
    try {
      const res = await fetch(`/api/recherche?q=${encodeURIComponent(texte)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: { resultats: ResultatRecherche[]; tronque: boolean } = await res.json()
      if (mine !== sequence) return
      resultats.value = data.resultats
      tronque.value = data.tronque
      status.value = 'done'
    } catch {
      if (mine !== sequence) return
      resultats.value = []
      tronque.value = false
      status.value = 'error'
    }
  }

  watch(query, (raw) => {
    clearTimeout(timer)
    const texte = raw.trim()
    if (texte.length < RECHERCHE_MIN_CARACTERES) {
      sequence++ // invalide une réponse encore en vol
      resultats.value = []
      tronque.value = false
      status.value = 'idle'
      return
    }
    status.value = 'loading'
    timer = setTimeout(() => void run(texte), delayMs)
  })

  if (getCurrentScope()) onScopeDispose(() => clearTimeout(timer))

  return { query, resultats, tronque, status }
}
