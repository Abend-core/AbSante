import { describe, expect, it } from 'vitest'
import { ConfigError, loadConfig } from '../src/config.js'

const base = { DATABASE_URL: 'postgres://u:p@localhost:5432/db' }

describe('loadConfig', () => {
  it('applique des valeurs par défaut raisonnables', () => {
    expect(loadConfig(base)).toEqual({
      host: '0.0.0.0',
      port: 3100,
      databaseUrl: base.DATABASE_URL,
      schema: 'rpps',
      logLevel: 'info',
      rateLimitMax: 120,
      trustProxy: false,
      dbPoolMax: 10,
      dbStatementTimeoutMs: 5000,
    })
  })

  it('lit les réglages fournis', () => {
    const config = loadConfig({
      ...base, PORT: '8080', HOST: '127.0.0.1', DB_SCHEMA: 'rpps_test', LOG_LEVEL: 'warn',
      RATE_LIMIT_MAX: '10', TRUST_PROXY: 'true', DB_POOL_MAX: '3', DB_STATEMENT_TIMEOUT_MS: '2000',
    })
    expect(config).toMatchObject({
      port: 8080, host: '127.0.0.1', schema: 'rpps_test', logLevel: 'warn',
      rateLimitMax: 10, trustProxy: true, dbPoolMax: 3, dbStatementTimeoutMs: 2000,
    })
  })

  it('exige DATABASE_URL', () => {
    expect(() => loadConfig({})).toThrow(ConfigError)
    expect(() => loadConfig({ DATABASE_URL: '' })).toThrow(/DATABASE_URL/)
  })

  it.each([
    ['PORT', 'abc'],
    ['PORT', '70000'],
    ['PORT', '-1'],
    ['RATE_LIMIT_MAX', '0'],
    ['DB_POOL_MAX', '1.5'],
    ['DB_STATEMENT_TIMEOUT_MS', '10'],
  ])('refuse %s=%s avec un message qui nomme le réglage', (name, value) => {
    expect(() => loadConfig({ ...base, [name]: value })).toThrow(new RegExp(name))
  })

  it('refuse un niveau de log inconnu', () => {
    expect(() => loadConfig({ ...base, LOG_LEVEL: 'bavard' })).toThrow(/LOG_LEVEL/)
  })

  it.each(['rpps; DROP TABLE x', 'Rpps', '1abc', 'a-b', 'a.b', '"x"'])('refuse le schéma dangereux %j (interpolé dans le SQL)', (schema) => {
    expect(() => loadConfig({ ...base, DB_SCHEMA: schema })).toThrow(/DB_SCHEMA/)
  })
})
