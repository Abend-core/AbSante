/** Configuration de l'API, lue depuis l'environnement et validée au démarrage : un
 *  réglage invalide fait échouer le démarrage avec un message clair, plutôt que de
 *  produire un comportement bizarre plus tard. */
export interface Config {
  host: string
  port: number
  databaseUrl: string
  /** Schéma Postgres des données RPPS (interpolé dans le SQL -> validé, voir ci-dessous). */
  schema: string
  logLevel: string
  /** Requêtes max par minute et par IP (protège la base d'un client trop bavard). */
  rateLimitMax: number
  trustProxy: boolean
  dbPoolMax: number
  dbStatementTimeoutMs: number
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']
/** Identifiant SQL sûr : le schéma est interpolé dans les requêtes (pas paramétrable). */
export const SCHEMA_PATTERN = /^[a-z_][a-z0-9_]{0,62}$/

function intFromEnv(env: NodeJS.ProcessEnv, name: string, fallback: number, min: number, max: number): number {
  const raw = env[name]
  if (raw === undefined || raw === '') return fallback
  if (!/^\d+$/.test(raw)) throw new ConfigError(`${name} doit être un entier (reçu : "${raw}")`)
  const value = Number(raw)
  if (value < min || value > max) throw new ConfigError(`${name} doit être compris entre ${min} et ${max} (reçu : ${value})`)
  return value
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const databaseUrl = env.DATABASE_URL
  if (!databaseUrl) throw new ConfigError('DATABASE_URL est obligatoire (ex: postgres://user:pass@localhost:5432/absante)')

  const schema = env.DB_SCHEMA || 'rpps'
  if (!SCHEMA_PATTERN.test(schema)) throw new ConfigError(`DB_SCHEMA invalide : "${schema}"`)

  const logLevel = env.LOG_LEVEL || 'info'
  if (!LOG_LEVELS.includes(logLevel)) throw new ConfigError(`LOG_LEVEL doit être l'un de : ${LOG_LEVELS.join(', ')}`)

  return {
    host: env.HOST || '0.0.0.0',
    port: intFromEnv(env, 'PORT', 3100, 0, 65535),
    databaseUrl,
    schema,
    logLevel,
    rateLimitMax: intFromEnv(env, 'RATE_LIMIT_MAX', 120, 1, 100_000),
    trustProxy: env.TRUST_PROXY === 'true',
    dbPoolMax: intFromEnv(env, 'DB_POOL_MAX', 10, 1, 100),
    dbStatementTimeoutMs: intFromEnv(env, 'DB_STATEMENT_TIMEOUT_MS', 5000, 100, 600_000),
  }
}
