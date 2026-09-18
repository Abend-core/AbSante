import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ACTIVITE_COLUMNS, DIPLOME_COLUMNS, SAVOIR_FAIRE_COLUMNS } from '../../src/import/columns.js'
import type { ColumnSpec } from '../../src/import/columns.js'

type Row = Record<string, string>

function toFile(columns: ColumnSpec, rows: Row[]): string {
  const header = columns.map(([, h]) => h).join('|')
  const lines = rows.map((row) => columns.map(([sql]) => row[sql] ?? '').join('|'))
  return [header, ...lines].join('\n') + '\n'
}

export interface RppsFixture {
  activites: Row[]
  diplomes: Row[]
  savoirFaire: Row[]
}

/** Écrit trois fichiers au format RPPS (mêmes en-têtes que les vrais) dans un dossier temporaire. */
export async function writeRppsFiles(fixture: RppsFixture) {
  const dir = await mkdtemp(join(tmpdir(), 'absante-rpps-'))
  const files = {
    activites: join(dir, 'PS_LibreAcces_Personne_activite.txt'),
    diplomes: join(dir, 'PS_LibreAcces_Dipl_AutExerc.txt'),
    savoirFaire: join(dir, 'PS_LibreAcces_SavoirFaire.txt'),
  }
  await writeFile(files.activites, toFile(ACTIVITE_COLUMNS, fixture.activites))
  await writeFile(files.diplomes, toFile(DIPLOME_COLUMNS, fixture.diplomes))
  await writeFile(files.savoirFaire, toFile(SAVOIR_FAIRE_COLUMNS, fixture.savoirFaire))
  return { dir, files }
}

const SOLENNE_ANTAGENE = '810006881261'
const SOLENNE_INFIRMIERE = '810110323986'
const DR_MARTIN = '810000000001'
const O_BRIEN = '810000000002'

export const IDS = { SOLENNE_ANTAGENE, SOLENNE_INFIRMIERE, DR_MARTIN, O_BRIEN }

/** Jeu de données réduit mais représentatif : homonymes, structure sans identifiant, activité sans
 *  structure, doublons exacts, spécialités, caractères piégeux (guillemet, antislash). */
export const FIXTURE: RppsFixture = {
  activites: [
    {
      type_id_pp: '8', id_pp: '10006881261', id_national: SOLENNE_ANTAGENE, civilite: 'Madame', // civilité d'exercice vide, comme dans le vrai fichier
     
      nom: 'BRUN', prenom: 'SOLENNE', code_profession: '86', profession: 'Technicien de Laboratoire', categorie: 'Civil',
      mode_exercice: 'Salarié', siret: '44154525800036', id_structure: 'R10000003840808', raison_sociale: 'ANTAGENE',
      num_voie: '6', libelle_voie: 'ALL DU LEVANT', bureau_cedex: '69890 TOUR DE SALVAGNY (LA)', code_postal: '69890',
      code_commune: '69250', commune: 'La Tour-de-Salvagny', pays: 'France', secteur: 'Recherche',
      role: 'Salarié en poste fixe', genre_activite: 'Activité standard de soin ou de pharmacien',
    },
    {
      type_id_pp: '8', id_pp: '10110323986', id_national: SOLENNE_INFIRMIERE, civilite_exercice: 'Madame', civilite: 'Madame',
      nom: 'BRUN', prenom: 'SOLENNE', code_profession: '60', profession: 'Infirmier', categorie: 'Civil', mode_exercice: 'Salarié',
      finess_site: 'F340785161', id_structure: 'F340785161', raison_sociale: 'HOPITAL LAPEYRONIE CHU MONTPELLIER',
      num_voie: '371', type_voie: 'Avenue', libelle_voie: 'DU DOYEN GASTON GIRAUD', code_postal: '34295', commune: 'Montpellier',
      telephone: '0467336733', telecopie: '0467338963', secteur: 'Etablissement Public de santé',
    },
    // Doublon exact de la ligne précédente : ne doit produire qu'une activité.
    {
      type_id_pp: '8', id_pp: '10110323986', id_national: SOLENNE_INFIRMIERE, civilite_exercice: 'Madame', civilite: 'Madame',
      nom: 'BRUN', prenom: 'SOLENNE', code_profession: '60', profession: 'Infirmier', categorie: 'Civil', mode_exercice: 'Salarié',
      finess_site: 'F340785161', id_structure: 'F340785161', raison_sociale: 'HOPITAL LAPEYRONIE CHU MONTPELLIER',
      num_voie: '371', type_voie: 'Avenue', libelle_voie: 'DU DOYEN GASTON GIRAUD', code_postal: '34295', commune: 'Montpellier',
      telephone: '0467336733', telecopie: '0467338963', secteur: 'Etablissement Public de santé',
    },
    // Second lieu d'exercice sans identifiant technique de structure -> clé calculée.
    {
      type_id_pp: '8', id_pp: '10110323986', id_national: SOLENNE_INFIRMIERE, civilite_exercice: 'Madame', civilite: 'Madame',
      nom: 'BRUN', prenom: 'SOLENNE', code_profession: '60', profession: 'Infirmier', categorie: 'Civil', mode_exercice: 'Libéral',
      raison_sociale: 'CABINET INFIRMIER', num_voie: '12', libelle_voie: 'RUE DES LILAS', code_postal: '34000', commune: 'Montpellier',
      email: 'cabinet@example.org',
    },
    // Aucune information de structure : activité sans lieu.
    {
      type_id_pp: '8', id_pp: '10000000001', id_national: DR_MARTIN, civilite_exercice: 'Docteur', civilite: 'Monsieur',
      nom: 'MARTIN', prenom: 'PAUL', code_profession: '10', profession: 'Médecin', categorie: 'Civil', mode_exercice: 'Libéral',
      code_savoir_faire: 'SM04', type_savoir_faire: 'Spécialité ordinale', savoir_faire: 'Cardiologie et maladies vasculaires',
    },
    {
      type_id_pp: '8', id_pp: '10000000002', id_national: O_BRIEN, nom: 'O"BRIEN\\D', prenom: 'ÉLODIE',
      code_profession: '10', profession: 'Médecin', raison_sociale: 'CABINET "DU PARC"', code_postal: '75001', commune: 'Paris',
    },
  ],
  diplomes: [
    {
      type_id_pp: '8', id_pp: '10006881261', id_national: SOLENNE_ANTAGENE, nom: 'BRUN', prenom: 'SOLENNE',
      code_type_diplome: 'AU', type_diplome: 'Autre type de diplôme', code_diplome: 'DIP348',
      diplome: 'Diplôme Technicien Laboratoire arrêté 21/10/1992',
    },
    {
      type_id_pp: '8', id_pp: '10110323986', id_national: SOLENNE_INFIRMIERE, nom: 'BRUN', prenom: 'SOLENNE',
      code_type_diplome: 'DE', type_diplome: "Diplôme d'Etat français", code_diplome: 'DE09', diplome: "Diplôme d'Etat français d'Infirmier",
    },
    // Personne absente du fichier des activités : ignorée (aucune fiche ne l'affichera).
    { type_id_pp: '8', id_pp: '99999999999', id_national: '899999999999', nom: 'INCONNU', prenom: 'X', code_diplome: 'DE01', diplome: 'Diplôme fantôme' },
  ],
  savoirFaire: [
    {
      type_id_pp: '8', id_pp: '10000000001', id_national: DR_MARTIN, nom: 'MARTIN', prenom: 'PAUL', code_profession: '10',
      profession: 'Médecin', code_type_savoir_faire: 'S', type_savoir_faire: 'Spécialité ordinale', code_savoir_faire: 'SM04',
      savoir_faire: 'Cardiologie et maladies vasculaires',
    },
    {
      type_id_pp: '8', id_pp: '10000000001', id_national: DR_MARTIN, nom: 'MARTIN', prenom: 'PAUL', code_profession: '10',
      profession: 'Médecin', code_type_savoir_faire: 'CM', type_savoir_faire: 'Compétence métier', code_savoir_faire: 'CM0001',
      savoir_faire: 'Échographie',
    },
  ],
}
