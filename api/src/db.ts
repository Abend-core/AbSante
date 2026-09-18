import pg from 'pg'

export interface PoolOptions {
  databaseUrl: string
  max?: number
  statementTimeoutMs?: number
  /** Appelé pour toute erreur d'un client inactif du pool (ex: Postgres redémarré). */
  onError?: (err: Error) => void
}

/** Pool de connexions avec des délais bornés : une base lente ou injoignable doit
 *  produire une erreur rapide (traduite en 503), jamais une requête qui pend. */
export function createPool(options: PoolOptions): pg.Pool {
  const pool = new pg.Pool({
    connectionString: options.databaseUrl,
    max: options.max ?? 10,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 30_000,
    statement_timeout: options.statementTimeoutMs ?? 5000,
    query_timeout: (options.statementTimeoutMs ?? 5000) + 1000,
  })
  // Sans écouteur, l'événement 'error' d'un client inactif (connexion coupée côté
  // serveur) ferait tomber tout le processus Node.
  pool.on('error', (err) => options.onError?.(err))
  return pool
}
