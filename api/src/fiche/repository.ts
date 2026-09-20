import type pg from 'pg'
import { SCHEMA_PATTERN } from '../config.js'
import { mapFiche } from './mapper.js'
import type { ActiviteRow, DiplomeRow, PraticienRow, SavoirFaireRow } from './mapper.js'
import { RECHERCHE_LIMITE, RECHERCHE_MIN_CARACTERES, normalizeQuery, toTsQuery } from './recherche.js'
import type { Recherche, ResultatRecherche } from './recherche.js'
import type { Fiche } from './types.js'

export interface PraticienRepository {
  /** `null` si aucun praticien n'a cet identifiant. */
  findFiche(id: string): Promise<Fiche | null>
  /** Praticiens dont « nom prénom » commence par chaque mot de `texte`, dans n'importe quel ordre.
   *  Vide si le texte est trop court pour être une recherche utile. */
  rechercher(texte: string): Promise<Recherche>
  /** Lève `RepositoryUnavailableError` si la base ne répond pas. */
  ping(): Promise<void>
}

/** La base est injoignable, coupée ou trop lente (≠ bug applicatif) : l'API répond 503
 *  (« réessayez ») plutôt que 500. */
export class RepositoryUnavailableError extends Error {
  constructor(cause: unknown) {
    super('Base de données indisponible', { cause })
    this.name = 'RepositoryUnavailableError'
  }
}

const UNAVAILABLE_CODES = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EPIPE', 'EAI_AGAIN',
  '57P01', '57P02', '57P03', // arrêt / redémarrage de Postgres
  '57014', // statement_timeout
  '53300', // trop de connexions
  '08000', '08001', '08003', '08004', '08006', // exceptions de connexion
  '28000', '28P01', // authentification refusée (mot de passe changé, mauvaise config)
  '3D000', // base inexistante
  '3F000', '42P01', // schéma / table absents : les données RPPS n'ont pas encore été importées
])
const UNAVAILABLE_MESSAGE =
  /timeout exceeded when trying to connect|Connection terminated|connection error|Query read timeout|starting up|shutting down/i

export function isUnavailableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const code = (err as { code?: unknown }).code
  if (typeof code === 'string' && UNAVAILABLE_CODES.has(code)) return true
  const nested = (err as { errors?: unknown }).errors
  if (Array.isArray(nested) && nested.some(isUnavailableError)) return true
  return UNAVAILABLE_MESSAGE.test(err.message)
}

async function guarded<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (err) {
    if (isUnavailableError(err)) throw new RepositoryUnavailableError(err)
    throw err
  }
}

interface PersonneRow {
  id_national: string
  civilite_exercice: string | null
  nom: string | null
  prenom: string | null
}

interface LieuRow {
  id_national: string
  professions: string[] | null
  commune: string | null
  code_postal: string | null
}

export class PgPraticienRepository implements PraticienRepository {
  private readonly pool: pg.Pool
  private readonly schema: string

  constructor(pool: pg.Pool, schema: string) {
    // Le schéma est interpolé dans le SQL (un identifiant ne se paramètre pas) -> on
    // refuse ici tout ce qui n'est pas un identifiant simple, même si la config l'a déjà validé.
    if (!SCHEMA_PATTERN.test(schema)) throw new Error(`Schéma invalide : "${schema}"`)
    this.pool = pool
    this.schema = schema
  }

  async ping(): Promise<void> {
    await guarded(() => this.pool.query('SELECT 1'))
  }

  async rechercher(texte: string): Promise<Recherche> {
    const mots = normalizeQuery(texte)
    if (mots.join('').length < RECHERCHE_MIN_CARACTERES) return { resultats: [], tronque: false }
    return guarded(async () => {
      const s = this.schema
      // Une ligne de plus que la limite : c'est ainsi qu'on sait qu'il y en avait d'autres.
      const trouves = await this.pool.query<PersonneRow>(
        `SELECT id_national, civilite_exercice, nom, prenom
           FROM ${s}.praticiens
          WHERE recherche @@ to_tsquery('simple', $1)
          ORDER BY nom, prenom, id_national
          LIMIT $2`,
        [toTsQuery(mots), RECHERCHE_LIMITE + 1],
      )
      const personnes = trouves.rows.slice(0, RECHERCHE_LIMITE)
      if (personnes.length === 0) return { resultats: [], tronque: false }

      const lieux = await this.pool.query<LieuRow>(
        `SELECT a.id_national,
                array_agg(DISTINCT a.profession) FILTER (WHERE a.profession IS NOT NULL) AS professions,
                (array_agg(st.commune ORDER BY a.id) FILTER (WHERE st.commune IS NOT NULL))[1] AS commune,
                (array_agg(st.code_postal ORDER BY a.id) FILTER (WHERE st.commune IS NOT NULL))[1] AS code_postal
           FROM ${s}.activites a
           LEFT JOIN ${s}.structures st ON st.cle = a.structure_cle
          WHERE a.id_national = ANY($1)
          GROUP BY a.id_national`,
        [personnes.map((p) => p.id_national)],
      )
      const lieuParId = new Map(lieux.rows.map((l) => [l.id_national, l]))
      const resultats: ResultatRecherche[] = personnes.map((p) => {
        const lieu = lieuParId.get(p.id_national)
        return {
          id: p.id_national,
          civiliteExercice: p.civilite_exercice,
          nom: p.nom,
          prenom: p.prenom,
          professions: lieu?.professions ?? [],
          commune: lieu?.commune ?? null,
          codePostal: lieu?.code_postal ?? null,
        }
      })
      return { resultats, tronque: trouves.rows.length > RECHERCHE_LIMITE }
    })
  }

  async findFiche(id: string): Promise<Fiche | null> {
    return guarded(async () => {
      const s = this.schema
      const praticien = await this.pool.query<PraticienRow>(
        `SELECT id_national, id_pp, type_identifiant, civilite, civilite_exercice, nom, prenom
           FROM ${s}.praticiens WHERE id_national = $1`,
        [id],
      )
      const row = praticien.rows[0]
      if (!row) return null

      const [activites, savoirFaire, diplomes, meta] = await Promise.all([
        this.pool.query<ActiviteRow>(
          `SELECT a.code_profession, a.profession, a.categorie, a.mode_exercice, a.secteur,
                  a.section_pharmaciens, a.role, a.genre_activite,
                  CASE WHEN st.cle IS NULL THEN NULL ELSE to_jsonb(st) END AS structure
             FROM ${s}.activites a
             LEFT JOIN ${s}.structures st ON st.cle = a.structure_cle
            WHERE a.id_national = $1
            ORDER BY a.id`,
          [id],
        ),
        this.pool.query<SavoirFaireRow>(
          `SELECT profession, type_savoir_faire, code_savoir_faire, savoir_faire
             FROM ${s}.savoir_faire WHERE id_national = $1 ORDER BY id`,
          [id],
        ),
        this.pool.query<DiplomeRow>(
          `SELECT type_diplome, code_diplome, diplome, type_autorisation, discipline_autorisation
             FROM ${s}.diplomes WHERE id_national = $1 ORDER BY id`,
          [id],
        ),
        this.pool.query<{ valeur: string }>(`SELECT valeur FROM ${s}.meta WHERE cle = 'updated_at'`),
      ])

      return mapFiche(row, activites.rows, savoirFaire.rows, diplomes.rows, meta.rows[0]?.valeur ?? null)
    })
  }
}
