/** Résultat de la recherche par nom : juste de quoi reconnaître la bonne personne avant d'ouvrir sa
 *  fiche (`/praticien/:id`). */
export interface ResultatRecherche {
  id: string
  civiliteExercice: string | null
  nom: string | null
  prenom: string | null
  professions: string[]
  commune: string | null
  codePostal: string | null
}

export interface Recherche {
  resultats: ResultatRecherche[]
  /** Vrai s'il y avait plus de résultats que la limite : l'appelant invite à préciser la recherche. */
  tronque: boolean
}

export const RECHERCHE_LIMITE = 20
export const RECHERCHE_MIN_CARACTERES = 3
const MAX_MOTS = 4

/** Mots de la recherche, normalisés comme la colonne `praticiens.recherche` (voir `searchable`
 *  dans import/sql.ts) : sans accents, en minuscules, ponctuation = séparateur (« Jean-Pierre »
 *  devient deux mots, comme à l'import). Ne contient que [a-z0-9] : sûr à mettre dans une tsquery. */
export function normalizeQuery(raw: string): string[] {
  return raw
    .replace(/œ/gi, 'oe')
    .replace(/æ/gi, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, MAX_MOTS)
}

/** tsquery « tous les mots, chacun en préfixe » : `['jean', 'dup']` -> `jean:* & dup:*`. */
export function toTsQuery(words: string[]): string {
  return words.map((w) => `${w}:*`).join(' & ')
}
