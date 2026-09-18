import { randomBytes } from 'node:crypto'
import pg from 'pg'

/** Postgres de test : `docker compose up -d postgres` (voir README) ou le service de la CI. */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://absante:absante@localhost:54329/absante'

/** Schéma unique par fichier de test : les tests d'intégration tournent en parallèle sur la
 *  même base sans jamais se marcher dessus. */
export function uniqueSchema(prefix: string): string {
  return `t_${prefix}_${randomBytes(4).toString('hex')}`
}

export async function dropSchemas(schema: string): Promise<void> {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL })
  await client.connect()
  try {
    for (const s of [schema, `${schema}_new`, `${schema}_old`]) await client.query(`DROP SCHEMA IF EXISTS ${s} CASCADE`)
  } finally {
    await client.end()
  }
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL })
  await client.connect()
  try {
    return (await client.query<T>(sql, params)).rows
  } finally {
    await client.end()
  }
}
