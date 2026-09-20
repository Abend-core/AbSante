/** Requêtes de construction des tables finales, à partir des tables « brutes » (staging)
 *  chargées par COPY. Tout est nettoyé ici (espaces, chaînes vides -> NULL) pour que
 *  l'API n'ait plus qu'à lire. `s` = schéma de travail (validé par l'appelant). */

/** Chaîne vide / blanche -> NULL, sinon valeur sans espaces autour. */
const n = (col: string) => `NULLIF(btrim(${col}), '')`

/** Champs décrivant une structure (lieu d'exercice). Servent à la fois à la déduire et
 *  à fabriquer une clé quand le fichier ne fournit pas d'identifiant technique. */
const STRUCTURE_FIELDS = [
  'siret', 'siren', 'finess_site', 'finess_ej', 'raison_sociale', 'enseigne',
  'complement_destinataire', 'complement_geo', 'num_voie', 'indice_voie', 'type_voie',
  'libelle_voie', 'mention_distribution', 'bureau_cedex', 'code_postal', 'code_commune',
  'commune', 'pays', 'telephone', 'telephone2', 'telecopie', 'email', 'departement',
]

/** Texte de recherche normalisé : sans accents, en minuscules, ponctuation -> espace. Écrit sans
 *  lower() ni collation sur les lettres accentuées : le Postgres alpine tourne en locale « C », où
 *  lower('É') ne change rien. Le miroir côté API est `normalizeQuery` (fiche/recherche.ts). */
const ACCENTS = 'ÀÁÂÄÃÅÇÈÉÊËÌÍÎÏÑÒÓÔÖÕÙÚÛÜÝàáâäãåçèéêëìíîïñòóôöõùúûüýÿ'
const SANS_ACCENTS = 'AAAAAACEEEEIIIINOOOOOUUUUYaaaaaaceeeeiiiinooooouuuuyy'
const searchable = (expr: string) =>
  `regexp_replace(lower(translate(replace(replace(replace(replace(${expr}, 'œ', 'oe'), 'Œ', 'OE'), 'æ', 'ae'), 'Æ', 'AE'), '${ACCENTS}', '${SANS_ACCENTS}')), '[^a-z0-9]+', ' ', 'g')`

const positional = STRUCTURE_FIELDS.map((f) => `COALESCE(${n(f)}, '')`).join(", ")
const anyStructureField = STRUCTURE_FIELDS.map((f) => n(f)).join(', ')

export function buildSql(s: string): string[] {
  return [
    // Table intermédiaire : lignes d'activité nettoyées + clé de structure calculée UNE fois.
    // Une structure est identifiée par son identifiant technique ; à défaut, par l'empreinte
    // de tous ses champs (les activités partageant le même lieu se regroupent) ; et si elle
    // n'a aucune information, l'activité n'a simplement pas de structure (clé NULL).
    `CREATE UNLOGGED TABLE ${s}.act AS
       SELECT ${n('id_national')} AS id_national, ${n('id_pp')} AS id_pp,
              ${n('type_id_pp')} AS type_id_pp, ${n('civilite')} AS civilite,
              ${n('civilite_exercice')} AS civilite_exercice, ${n('nom')} AS nom, ${n('prenom')} AS prenom,
              ${n('code_profession')} AS code_profession, ${n('profession')} AS profession,
              ${n('categorie')} AS categorie, ${n('type_savoir_faire')} AS type_savoir_faire,
              ${n('code_savoir_faire')} AS code_savoir_faire, ${n('savoir_faire')} AS savoir_faire,
              ${n('mode_exercice')} AS mode_exercice, ${n('secteur')} AS secteur,
              ${n('section_pharmaciens')} AS section_pharmaciens, ${n('role')} AS role,
              ${n('genre_activite')} AS genre_activite,
              ${n('id_structure')} AS id_structure,
              ${n('siret')} AS siret, ${n('siren')} AS siren, ${n('finess_site')} AS finess_site,
              ${n('finess_ej')} AS finess_ej, ${n('raison_sociale')} AS raison_sociale,
              ${n('enseigne')} AS enseigne, ${n('complement_destinataire')} AS complement_destinataire,
              ${n('complement_geo')} AS complement_geo,
              NULLIF(btrim(concat_ws(' ', ${n('num_voie')}, ${n('indice_voie')}, ${n('type_voie')}, ${n('libelle_voie')})), '') AS voie,
              ${n('mention_distribution')} AS mention_distribution, ${n('bureau_cedex')} AS bureau_cedex,
              ${n('code_postal')} AS code_postal, ${n('code_commune')} AS code_commune,
              ${n('commune')} AS commune, ${n('pays')} AS pays, ${n('telephone')} AS telephone,
              ${n('telephone2')} AS telephone2, ${n('telecopie')} AS telecopie, ${n('email')} AS email,
              ${n('departement')} AS departement,
              COALESCE(
                ${n('id_structure')},
                CASE WHEN COALESCE(${anyStructureField}) IS NOT NULL
                     THEN 'x:' || md5(concat_ws('|', ${positional})) END
              ) AS structure_cle
         FROM ${s}.stg_activite
        WHERE ${n('id_national')} IS NOT NULL`,

    // Recherche par nom : colonne plein texte (« simple » = sans racinisation ni mots vides, les
    // noms propres ne sont pas de la langue) sur « nom prénom » normalisé, avec un index GIN. Elle
    // répond aux préfixes dans n'importe quel ordre (« jean dup », « dupont jean ») sans extension
    // à installer.
    `CREATE TABLE ${s}.praticiens AS
       SELECT DISTINCT ON (id_national) id_national, id_pp, type_id_pp AS type_identifiant,
              civilite, civilite_exercice, nom, prenom,
              to_tsvector('simple', ${searchable("concat_ws(' ', nom, prenom)")}) AS recherche
         FROM ${s}.act
        ORDER BY id_national, nom, prenom, civilite_exercice`,
    `ALTER TABLE ${s}.praticiens ADD PRIMARY KEY (id_national)`,
    `CREATE INDEX ON ${s}.praticiens USING gin (recherche)`,

    `CREATE TABLE ${s}.structures AS
       SELECT DISTINCT ON (structure_cle)
              structure_cle AS cle, id_structure, siret, siren, finess_site, finess_ej,
              raison_sociale, enseigne, complement_destinataire, complement_geo, voie,
              mention_distribution, bureau_cedex, code_postal, code_commune, commune, pays,
              telephone, telephone2, telecopie, email, departement
         FROM ${s}.act
        WHERE structure_cle IS NOT NULL
        ORDER BY structure_cle, raison_sociale, voie, commune`,
    `ALTER TABLE ${s}.structures ADD PRIMARY KEY (cle)`,

    `CREATE TABLE ${s}.activites AS
       SELECT (row_number() OVER (ORDER BY id_national, profession, mode_exercice, structure_cle, secteur, role))::bigint AS id, d.*
         FROM (SELECT DISTINCT id_national, code_profession, profession, categorie, mode_exercice,
                      secteur, section_pharmaciens, role, genre_activite, structure_cle
                 FROM ${s}.act) d`,
    `CREATE INDEX ON ${s}.activites (id_national)`,

    // Spécialités / compétences : fichier dédié + celles qui figurent déjà sur les lignes
    // d'activité (union dédoublonnée -> aucune information perdue quelle que soit la source).
    `CREATE TABLE ${s}.savoir_faire AS
       SELECT (row_number() OVER (ORDER BY id_national, type_savoir_faire, code_savoir_faire, profession))::bigint AS id, d.*
         FROM (
           SELECT ${n('id_national')} AS id_national, ${n('profession')} AS profession,
                  ${n('type_savoir_faire')} AS type_savoir_faire,
                  ${n('code_savoir_faire')} AS code_savoir_faire, ${n('savoir_faire')} AS savoir_faire
             FROM ${s}.stg_savoir_faire
           UNION
           SELECT id_national, profession, type_savoir_faire, code_savoir_faire, savoir_faire FROM ${s}.act
         ) d
        WHERE d.id_national IN (SELECT id_national FROM ${s}.praticiens)
          AND (d.code_savoir_faire IS NOT NULL OR d.savoir_faire IS NOT NULL)`,
    `CREATE INDEX ON ${s}.savoir_faire (id_national)`,

    `CREATE TABLE ${s}.diplomes AS
       SELECT (row_number() OVER (ORDER BY id_national, type_diplome, code_diplome, type_autorisation))::bigint AS id, d.*
         FROM (
           SELECT DISTINCT ${n('id_national')} AS id_national, ${n('type_diplome')} AS type_diplome,
                  ${n('code_diplome')} AS code_diplome, ${n('diplome')} AS diplome,
                  ${n('type_autorisation')} AS type_autorisation,
                  ${n('discipline_autorisation')} AS discipline_autorisation
             FROM ${s}.stg_diplome
         ) d
        WHERE d.id_national IN (SELECT id_national FROM ${s}.praticiens)
          AND (d.code_diplome IS NOT NULL OR d.diplome IS NOT NULL
               OR d.type_autorisation IS NOT NULL OR d.discipline_autorisation IS NOT NULL)`,
    `CREATE INDEX ON ${s}.diplomes (id_national)`,

    // Effectifs par département, profession et spécialité au jour de l'import (voir
    // scripts/snapshot_effectifs.py). Vide après l'import : le workflow la remplit avant le dump,
    // puis le Pi la recopie dans l'historique (scripts/history_upsert.sql). Elle existe toujours,
    // pour que cette recopie n'échoue jamais sur une table absente.
    `CREATE TABLE ${s}.effectifs_snapshot (
       date_donnees date NOT NULL, departement text NOT NULL, profession text NOT NULL,
       specialite text NOT NULL DEFAULT '', n integer NOT NULL,
       PRIMARY KEY (departement, profession, specialite))`,

    `CREATE TABLE ${s}.meta (cle text PRIMARY KEY, valeur text NOT NULL)`,
  ]
}

export const ANALYZE_TABLES = ['praticiens', 'structures', 'activites', 'savoir_faire', 'diplomes']
