/** Fiche détaillée d'un praticien telle que servie par l'API (`api/src/fiche/types.ts`).
 *  Toute information absente du RPPS vaut `null`. */
export interface Structure {
  cle: string
  raisonSociale: string | null
  enseigne: string | null
  siret: string | null
  siren: string | null
  finessSite: string | null
  finessJuridique: string | null
  complementDestinataire: string | null
  complementPointGeographique: string | null
  voie: string | null
  mentionDistribution: string | null
  bureauCedex: string | null
  codePostal: string | null
  codeCommune: string | null
  commune: string | null
  pays: string | null
  telephone: string | null
  telephone2: string | null
  telecopie: string | null
  email: string | null
  departement: string | null
}

export interface Activite {
  codeProfession: string | null
  profession: string | null
  categorie: string | null
  modeExercice: string | null
  secteurActivite: string | null
  sectionPharmaciens: string | null
  role: string | null
  genreActivite: string | null
  structure: Structure | null
}

export interface SavoirFaire {
  profession: string | null
  type: string | null
  code: string | null
  libelle: string | null
}

export interface Diplome {
  type: string | null
  code: string | null
  libelle: string | null
  typeAutorisation: string | null
  disciplineAutorisation: string | null
}

export interface Fiche {
  id: string
  identifiantPP: string | null
  typeIdentifiant: string | null
  civilite: string | null
  civiliteExercice: string | null
  nom: string | null
  prenom: string | null
  activites: Activite[]
  savoirFaire: SavoirFaire[]
  diplomes: Diplome[]
  misAJourLe: string | null
}
