/** « 0467336733 » -> « 04 67 33 67 33 ». Un numéro qui n'a pas la forme attendue
 *  (étranger, incomplet...) est affiché tel quel : on ne l'invente ni ne le tronque jamais. */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/[\s.]/g, '')
  return /^\d{10}$/.test(digits) ? digits.replace(/(\d{2})(?=\d)/g, '$1 ') : raw
}

/** SIRET (14 chiffres) -> « 441 545 258 00036 » ; SIREN (9) -> « 340 785 161 ». Sinon tel quel. */
export function formatSiret(raw: string): string {
  if (/^\d{14}$/.test(raw)) return `${raw.slice(0, 3)} ${raw.slice(3, 6)} ${raw.slice(6, 9)} ${raw.slice(9)}`
  if (/^\d{9}$/.test(raw)) return `${raw.slice(0, 3)} ${raw.slice(3, 6)} ${raw.slice(6)}`
  return raw
}

/** « ANNE-CLAIRE » -> « Anne-Claire » (le RPPS met les prénoms en capitales). */
export function titleCase(raw: string): string {
  return raw.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_m, sep: string, letter: string) => sep + letter.toUpperCase())
}

/** Nom d'affichage : « Docteur Paul MARTIN », « Madame Solenne BRUN »... Les parties
 *  absentes sont simplement omises (on n'écrit jamais « null »). */
export function displayName(fiche: { civiliteExercice: string | null; civilite: string | null; prenom: string | null; nom: string | null }): string {
  const parts = [fiche.civiliteExercice ?? fiche.civilite, fiche.prenom ? titleCase(fiche.prenom) : null, fiche.nom]
  return parts.filter((p): p is string => !!p).join(' ')
}
