import type { Activite, Diplome, Fiche, SavoirFaire, Structure } from './types.js'

type Nullable = string | null

export interface PraticienRow {
  id_national: string
  id_pp: Nullable
  type_identifiant: Nullable
  civilite: Nullable
  civilite_exercice: Nullable
  nom: Nullable
  prenom: Nullable
}

/** `structure` : la ligne `structures` sérialisée en JSON par Postgres (to_jsonb), ou null. */
export interface ActiviteRow {
  code_profession: Nullable
  profession: Nullable
  categorie: Nullable
  mode_exercice: Nullable
  secteur: Nullable
  section_pharmaciens: Nullable
  role: Nullable
  genre_activite: Nullable
  structure: Record<string, Nullable> | null
}

export interface SavoirFaireRow {
  profession: Nullable
  type_savoir_faire: Nullable
  code_savoir_faire: Nullable
  savoir_faire: Nullable
}

export interface DiplomeRow {
  type_diplome: Nullable
  code_diplome: Nullable
  diplome: Nullable
  type_autorisation: Nullable
  discipline_autorisation: Nullable
}

/** Chaîne vide ou blanche -> null (la base est déjà nettoyée à l'import ; on reste
 *  défensif pour ne jamais laisser filtrer une valeur vide vers le front). */
function clean(value: unknown): Nullable {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function mapStructure(row: Record<string, Nullable> | null): Structure | null {
  if (!row) return null
  return {
    cle: clean(row.cle) ?? '',
    raisonSociale: clean(row.raison_sociale),
    enseigne: clean(row.enseigne),
    siret: clean(row.siret),
    siren: clean(row.siren),
    finessSite: clean(row.finess_site),
    finessJuridique: clean(row.finess_ej),
    complementDestinataire: clean(row.complement_destinataire),
    complementPointGeographique: clean(row.complement_geo),
    voie: clean(row.voie),
    mentionDistribution: clean(row.mention_distribution),
    bureauCedex: clean(row.bureau_cedex),
    codePostal: clean(row.code_postal),
    codeCommune: clean(row.code_commune),
    commune: clean(row.commune),
    pays: clean(row.pays),
    telephone: clean(row.telephone),
    telephone2: clean(row.telephone2),
    telecopie: clean(row.telecopie),
    email: clean(row.email),
    departement: clean(row.departement),
  }
}

function mapActivite(row: ActiviteRow): Activite {
  return {
    codeProfession: clean(row.code_profession),
    profession: clean(row.profession),
    categorie: clean(row.categorie),
    modeExercice: clean(row.mode_exercice),
    secteurActivite: clean(row.secteur),
    sectionPharmaciens: clean(row.section_pharmaciens),
    role: clean(row.role),
    genreActivite: clean(row.genre_activite),
    structure: mapStructure(row.structure),
  }
}

function mapSavoirFaire(row: SavoirFaireRow): SavoirFaire {
  return {
    profession: clean(row.profession),
    type: clean(row.type_savoir_faire),
    code: clean(row.code_savoir_faire),
    libelle: clean(row.savoir_faire),
  }
}

function mapDiplome(row: DiplomeRow): Diplome {
  return {
    type: clean(row.type_diplome),
    code: clean(row.code_diplome),
    libelle: clean(row.diplome),
    typeAutorisation: clean(row.type_autorisation),
    disciplineAutorisation: clean(row.discipline_autorisation),
  }
}

export function mapFiche(
  praticien: PraticienRow,
  activites: ActiviteRow[],
  savoirFaire: SavoirFaireRow[],
  diplomes: DiplomeRow[],
  misAJourLe: Nullable,
): Fiche {
  return {
    id: praticien.id_national,
    identifiantPP: clean(praticien.id_pp),
    typeIdentifiant: clean(praticien.type_identifiant),
    civilite: clean(praticien.civilite),
    civiliteExercice: clean(praticien.civilite_exercice),
    nom: clean(praticien.nom),
    prenom: clean(praticien.prenom),
    activites: activites.map(mapActivite),
    savoirFaire: savoirFaire.map(mapSavoirFaire),
    diplomes: diplomes.map(mapDiplome),
    misAJourLe: clean(misAJourLe),
  }
}
