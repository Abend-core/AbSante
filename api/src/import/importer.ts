import { createReadStream } from 'node:fs'
import { access, constants, open } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import pg from 'pg'
import { from as copyFrom } from 'pg-copy-streams'
import { SCHEMA_PATTERN } from '../config.js'
import { ACTIVITE_COLUMNS, DIPLOME_COLUMNS, SAVOIR_FAIRE_COLUMNS } from './columns.js'
import type { ColumnSpec } from './columns.js'
import { ANALYZE_TABLES, buildSql } from './sql.js'

export class ImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportError'
  }
}

export interface ImportOptions {
  databaseUrl: string
  /** Schéma servi à l'API (défaut : rpps). Le schéma de travail s'appelle `<schéma>_new`. */
  schema?: string
  files: { activites: string; diplomes: string; savoirFaire: string }
  /** Nombre minimal de lignes d'activité attendu. En dessous, le fichier est jugé tronqué
   *  (téléchargement interrompu...) et l'import est refusé : on garde les données actuelles. */
  minActivites?: number
  log?: (message: string) => void
}

export interface ImportResult {
  counts: Record<'praticiens' | 'structures' | 'activites' | 'savoir_faire' | 'diplomes', number>
  durationMs: number
}

/** Verrou par schéma cible : deux imports du même schéma ne peuvent pas tourner en même temps. */
const lockKey = (schema: string) => `absante-import-rpps:${schema}`

/** Lit uniquement la première ligne (l'en-tête) sans charger le fichier (~800 Mo). */
async function readHeader(path: string): Promise<string[]> {
  const handle = await open(path, 'r')
  try {
    const buffer = Buffer.alloc(16 * 1024)
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0)
    const text = buffer.toString('utf8', 0, bytesRead).replace(/^﻿/, '')
    const end = text.search(/\r?\n/)
    return (end === -1 ? text : text.slice(0, end)).split('|').map((h) => h.trim())
  } finally {
    await handle.close()
  }
}

async function checkFile(path: string, label: string, columns: ColumnSpec): Promise<void> {
  try {
    await access(path, constants.R_OK)
  } catch {
    throw new ImportError(`Fichier ${label} introuvable ou illisible : ${path}`)
  }
  const header = await readHeader(path)
  const expected = columns.map(([, h]) => h)
  const mismatch = expected.findIndex((h, i) => header[i] !== h)
  if (header.length !== expected.length || mismatch !== -1) {
    const at = mismatch === -1 ? Math.min(header.length, expected.length) : mismatch
    throw new ImportError(
      `En-tête du fichier ${label} inattendu (${header.length} colonnes, ${expected.length} attendues) : ` +
        `colonne ${at + 1} « ${header[at] ?? '(absente)'} » au lieu de « ${expected[at] ?? '(aucune)'} ». ` +
        `Le format du fichier RPPS a probablement changé.`,
    )
  }
}

async function copyFile(client: pg.Client, table: string, columns: ColumnSpec, path: string): Promise<number> {
  const names = columns.map(([sql]) => sql).join(', ')
  // Format CSV avec un guillemet impossible (\x01) : le RPPS n'est pas du vrai CSV, un « " »
  // isolé dans un nom ne doit ni fusionner des lignes ni faire échouer le chargement.
  const stream = client.query(
    copyFrom(`COPY ${table} (${names}) FROM STDIN WITH (FORMAT csv, DELIMITER '|', QUOTE E'\\x01', HEADER true)`),
  )
  try {
    await pipeline(createReadStream(path), stream)
  } catch (err) {
    // Ligne mal formée (mauvais nombre de colonnes, encodage invalide...) : on dit laquelle.
    const detail = err as Error & { where?: string }
    throw new ImportError(`Chargement de ${path} impossible : ${detail.message}${detail.where ? ` (${detail.where})` : ''}`)
  }
  return stream.rowCount ?? 0
}

export async function importRpps(options: ImportOptions): Promise<ImportResult> {
  const schema = options.schema ?? 'rpps'
  if (!SCHEMA_PATTERN.test(schema) || schema.length > 55) throw new ImportError(`Schéma invalide : "${schema}"`)
  const work = `${schema}_new`
  const old = `${schema}_old`
  const log = options.log ?? (() => {})
  const started = Date.now()

  // Tout est vérifié AVANT de toucher à la base : fichiers présents, en-têtes conformes.
  await checkFile(options.files.activites, 'des activités', ACTIVITE_COLUMNS)
  await checkFile(options.files.diplomes, 'des diplômes', DIPLOME_COLUMNS)
  await checkFile(options.files.savoirFaire, 'des savoir-faire', SAVOIR_FAIRE_COLUMNS)

  // statement_timeout à 0 : un import légitime dure plusieurs minutes.
  const client = new pg.Client({ connectionString: options.databaseUrl, statement_timeout: 0 })
  await client.connect()
  let locked = false
  try {
    const lock = await client.query<{ ok: boolean }>('SELECT pg_try_advisory_lock(hashtext($1)) AS ok', [lockKey(schema)])
    if (!lock.rows[0]?.ok) throw new ImportError('Un autre import est déjà en cours.')
    locked = true

    // Les données servies par l'API ne sont jamais touchées avant la bascule finale :
    // on construit tout dans un schéma de travail, jeté en cas d'échec.
    await client.query(`DROP SCHEMA IF EXISTS ${work} CASCADE`)
    await client.query(`CREATE SCHEMA ${work}`)
    try {
      const staging: [string, ColumnSpec][] = [
        ['stg_activite', ACTIVITE_COLUMNS],
        ['stg_diplome', DIPLOME_COLUMNS],
        ['stg_savoir_faire', SAVOIR_FAIRE_COLUMNS],
      ]
      for (const [table, columns] of staging) {
        await client.query(`CREATE UNLOGGED TABLE ${work}.${table} (${columns.map(([c]) => `${c} text`).join(', ')})`)
      }

      const nActivites = await copyFile(client, `${work}.stg_activite`, ACTIVITE_COLUMNS, options.files.activites)
      log(`${nActivites} lignes d'activité chargées`)
      const minActivites = options.minActivites ?? 1
      if (nActivites < minActivites) {
        throw new ImportError(
          `Fichier des activités trop court (${nActivites} lignes, ${minActivites} attendues au minimum) : ` +
            `téléchargement probablement interrompu, import annulé, données actuelles conservées.`,
        )
      }
      log(`${await copyFile(client, `${work}.stg_diplome`, DIPLOME_COLUMNS, options.files.diplomes)} lignes de diplômes chargées`)
      log(`${await copyFile(client, `${work}.stg_savoir_faire`, SAVOIR_FAIRE_COLUMNS, options.files.savoirFaire)} lignes de savoir-faire chargées`)

      for (const statement of buildSql(work)) await client.query(statement)
      await client.query(`DROP TABLE ${work}.stg_activite, ${work}.stg_diplome, ${work}.stg_savoir_faire, ${work}.act`)

      const counts = {} as ImportResult['counts']
      for (const table of ANALYZE_TABLES) {
        const res = await client.query<{ n: string }>(`SELECT count(*) AS n FROM ${work}.${table}`)
        counts[table as keyof ImportResult['counts']] = Number(res.rows[0]?.n ?? 0)
      }
      if (counts.praticiens === 0) throw new ImportError('Aucun praticien après import : import annulé.')

      const meta: [string, string][] = [['updated_at', new Date().toISOString()], ...Object.entries(counts).map(([k, v]) => [`count_${k}`, String(v)] as [string, string])]
      for (const [cle, valeur] of meta) await client.query(`INSERT INTO ${work}.meta (cle, valeur) VALUES ($1, $2)`, [cle, valeur])
      for (const table of ANALYZE_TABLES) await client.query(`ANALYZE ${work}.${table}`)

      // Bascule atomique : les requêtes en cours voient l'ancien schéma, les suivantes le nouveau.
      await client.query('BEGIN')
      await client.query(`DROP SCHEMA IF EXISTS ${old} CASCADE`)
      const exists = await client.query('SELECT 1 FROM information_schema.schemata WHERE schema_name = $1', [schema])
      if (exists.rowCount) await client.query(`ALTER SCHEMA ${schema} RENAME TO ${old}`)
      await client.query(`ALTER SCHEMA ${work} RENAME TO ${schema}`)
      await client.query('COMMIT')
      await client.query(`DROP SCHEMA IF EXISTS ${old} CASCADE`)
      log(`Import terminé : ${JSON.stringify(counts)}`)
      return { counts, durationMs: Date.now() - started }
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      await client.query(`DROP SCHEMA IF EXISTS ${work} CASCADE`).catch(() => {})
      throw err
    }
  } finally {
    if (locked) await client.query('SELECT pg_advisory_unlock(hashtext($1))', [lockKey(schema)]).catch(() => {})
    await client.end().catch(() => {})
  }
}
