import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useClipboard } from './useClipboard'

const writeText = vi.fn()

beforeEach(() => {
  vi.useFakeTimers()
  writeText.mockReset().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  document.execCommand = vi.fn(() => true)
})
afterEach(() => {
  vi.useRealTimers()
  Reflect.deleteProperty(navigator, 'clipboard')
})

const setup = (ms?: number) => effectScope().run(() => useClipboard(ms))!

describe('useClipboard', () => {
  it("copie avec l'API moderne et passe à « copied » puis revient à « idle »", async () => {
    const { status, copy } = setup(1000)
    expect(status.value).toBe('idle')
    expect(await copy('abc')).toBe(true)
    expect(writeText).toHaveBeenCalledWith('abc')
    expect(status.value).toBe('copied')
    vi.advanceTimersByTime(1001)
    expect(status.value).toBe('idle')
  })

  it("retombe sur l'ancienne méthode quand l'API moderne est refusée (page non sécurisée)", async () => {
    writeText.mockRejectedValue(new Error('NotAllowedError'))
    const { status, copy } = setup()
    expect(await copy('abc')).toBe(true)
    expect(document.execCommand).toHaveBeenCalledWith('copy')
    expect(status.value).toBe('copied')
  })

  it("retombe sur l'ancienne méthode quand l'API moderne n'existe pas", async () => {
    Reflect.deleteProperty(navigator, 'clipboard')
    expect(await setup().copy('abc')).toBe(true)
    expect(document.execCommand).toHaveBeenCalledWith('copy')
  })

  it("nettoie l'élément temporaire de la copie de secours", async () => {
    Reflect.deleteProperty(navigator, 'clipboard')
    await setup().copy('abc')
    expect(document.querySelector('textarea')).toBeNull()
  })

  it("passe à « failed » quand aucune méthode ne fonctionne", async () => {
    writeText.mockRejectedValue(new Error('denied'))
    document.execCommand = vi.fn(() => false)
    const { status, copy } = setup()
    expect(await copy('abc')).toBe(false)
    expect(status.value).toBe('failed')
  })

  it("une exception de execCommand est traitée comme un échec, sans planter", async () => {
    Reflect.deleteProperty(navigator, 'clipboard')
    document.execCommand = vi.fn(() => {
      throw new Error('unsupported')
    })
    expect(await setup().copy('abc')).toBe(false)
  })

  it('un second clic repart pour une durée complète', async () => {
    const { status, copy } = setup(1000)
    await copy('a')
    vi.advanceTimersByTime(800)
    await copy('a')
    vi.advanceTimersByTime(800)
    expect(status.value).toBe('copied')
    vi.advanceTimersByTime(300)
    expect(status.value).toBe('idle')
  })
})
