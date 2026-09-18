import { ref } from 'vue'

export interface Praticien {
  nom: string
  prenom: string
  profession: string
}

export interface Etablissement {
  nom: string
  /** Coordonnées géocodées (Base Adresse Nationale) de l'adresse réelle de l'établissement,
   *  ou `null` si son adresse n'a pas pu être géocodée (voir scripts/geocode_etablissements.py)
   *  — dans ce cas on retombe sur les coordonnées de la commune, pas un point inventé. */
  coords: [number, number] | null
  praticiens: Praticien[]
}

// [nom établissement, [lat, lon] | null, [[nom, prénom, profession], ...]]
type EtablissementRow = [string, [number, number] | null, [string, string, string][]]

interface DeptPayload {
  updatedAt: string
  communes: Record<string, EtablissementRow[]>
}

/**
 * Détail des établissements par commune, TOUS (pas seulement un "top 3" agrégé comme
 * avant) avec le nom/prénom/profession de chaque praticien qui y exerce, et leurs
 * vraies coordonnées géocodées quand elles existent — un praticien isolé (ex: cabinet
 * individuel) apparaît donc comme n'importe quel autre, à sa vraie adresse.
 *
 * Volumineux pour la France entière (~580 000 établissements) -> un fichier par
 * département (`scripts/update_rpps.py`), chargé à la demande seulement quand on
 * zoome dessus (voir `zoomedDept` dans useFranceRppsStats), pas au démarrage.
 */
export function useEtablissements() {
  const byDept = ref<Record<string, DeptPayload>>({})
  const loading = ref(false)

  async function loadDept(dept: string) {
    if (byDept.value[dept]) return
    loading.value = true
    try {
      const data: DeptPayload = await fetch(`/data/etablissements/${dept}.json`).then((res) => res.json())
      byDept.value = { ...byDept.value, [dept]: data }
    } finally {
      loading.value = false
    }
  }

  /** `profession` : si fournie (et différente de "Tous"), ne garde que les établissements
   *  ayant au moins un praticien de cette profession, et ne liste que ces praticiens-là
   *  (chaque praticien a sa propre profession dans les données -> plus besoin de se limiter
   *  à "Tous" comme avant, quand seul un total agrégé toutes professions était connu). */
  function forCommune(dept: string, codeInsee: string, profession?: string): Etablissement[] {
    const rows = byDept.value[dept]?.communes[codeInsee]
    if (!rows) return []
    const etabs = rows.map(([nom, coords, praticiens]) => ({
      nom,
      coords,
      praticiens: praticiens.map(([nomP, prenom, prof]) => ({ nom: nomP, prenom, profession: prof })),
    }))
    if (!profession || profession === 'Tous') return etabs
    return etabs
      .map((e) => ({ ...e, praticiens: e.praticiens.filter((p) => p.profession === profession) }))
      .filter((e) => e.praticiens.length > 0)
  }

  return { loading, loadDept, forCommune }
}
