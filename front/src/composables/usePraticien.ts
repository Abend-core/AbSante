import { ref, watch, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type { Fiche } from '../types/fiche'

export type FicheState =
  | { status: 'loading' }
  | { status: 'ready'; fiche: Fiche }
  /** Aucun praticien ne porte cet identifiant (ou il est mal formé). */
  | { status: 'not-found' }
  /** L'API ne répond pas (réseau, base en panne, service redémarrant) : réessayer a du sens. */
  | { status: 'unavailable' }
  | { status: 'error' }

/** Charge la fiche d'un praticien depuis l'API (`/api/praticiens/:id`), et la recharge si
 *  l'identifiant change. Ne lève jamais : tout échec devient un état affichable. */
export function usePraticien(id: MaybeRefOrGetter<string>) {
  const state = ref<FicheState>({ status: 'loading' })
  // Une réponse tardive d'un ancien identifiant ne doit pas écraser la fiche courante.
  let request = 0

  async function load() {
    const current = ++request
    state.value = { status: 'loading' }
    const result = await fetchFiche(toValue(id))
    if (current === request) state.value = result
  }

  watch(() => toValue(id), load, { immediate: true })

  return { state, reload: load }
}

async function fetchFiche(id: string): Promise<FicheState> {
  try {
    const res = await fetch(`/api/praticiens/${encodeURIComponent(id)}`)
    if (res.status === 404 || res.status === 400) return { status: 'not-found' }
    if (res.status >= 500) return { status: 'unavailable' }
    if (!res.ok) return { status: 'error' }
    return { status: 'ready', fiche: (await res.json()) as Fiche }
  } catch (err) {
    // fetch rejette sur une coupure réseau ; res.json() rejette sur un corps illisible
    return err instanceof SyntaxError ? { status: 'error' } : { status: 'unavailable' }
  }
}
