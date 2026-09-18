import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deferredPrompt, installed, isIos, isStandalone, listenForInstallPrompt } from './installPrompt'

beforeEach(() => {
  deferredPrompt.value = null
  installed.value = false
})
afterEach(() => vi.restoreAllMocks())

describe('listenForInstallPrompt', () => {
  it("conserve l'invite du navigateur et empêche sa mini-barre automatique", () => {
    const stop = listenForInstallPrompt(window)
    const event = new Event('beforeinstallprompt', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(deferredPrompt.value).toBe(event)
    stop()
  })

  it("passe à « installée » et libère l'invite après l'installation", () => {
    const stop = listenForInstallPrompt(window)
    window.dispatchEvent(new Event('beforeinstallprompt', { cancelable: true }))
    window.dispatchEvent(new Event('appinstalled'))
    expect(installed.value).toBe(true)
    expect(deferredPrompt.value).toBeNull()
    stop()
  })

  it("cesse d'écouter une fois arrêtée", () => {
    listenForInstallPrompt(window)()
    window.dispatchEvent(new Event('beforeinstallprompt', { cancelable: true }))
    expect(deferredPrompt.value).toBeNull()
  })

  it("part de « installée » quand l'application tourne déjà en fenêtre autonome", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia
    const stop = listenForInstallPrompt(window)
    expect(installed.value).toBe(true)
    stop()
    Reflect.deleteProperty(window, 'matchMedia')
  })
})

describe('isStandalone', () => {
  it('détecte le mode fenêtre autonome (display-mode)', () => {
    const win = { matchMedia: () => ({ matches: true }), navigator: {} } as unknown as Window
    expect(isStandalone(win)).toBe(true)
  })

  it('détecte le mode autonome de Safari iOS (navigator.standalone)', () => {
    const win = { matchMedia: () => ({ matches: false }), navigator: { standalone: true } } as unknown as Window
    expect(isStandalone(win)).toBe(true)
  })

  it('est faux dans un onglet normal, ou sans matchMedia', () => {
    expect(isStandalone({ matchMedia: () => ({ matches: false }), navigator: {} } as unknown as Window)).toBe(false)
    expect(isStandalone({ navigator: {} } as unknown as Window)).toBe(false)
  })
})

describe('isIos', () => {
  const nav = (userAgent: string, platform = 'iPhone', maxTouchPoints = 5) => ({ userAgent, platform, maxTouchPoints })

  it.each(['iPhone', 'iPad', 'iPod'])('reconnaît %s', (device) => {
    expect(isIos(nav(`Mozilla/5.0 (${device}; CPU OS 17_0)`))).toBe(true)
  })

  it('reconnaît un iPad qui se présente comme un Mac (iPadOS)', () => {
    expect(isIos(nav('Mozilla/5.0 (Macintosh)', 'MacIntel', 5))).toBe(true)
  })

  it('ne confond pas avec Android, Windows ou un vrai Mac', () => {
    expect(isIos(nav('Mozilla/5.0 (Linux; Android 14)', 'Linux armv8l', 5))).toBe(false)
    expect(isIos(nav('Mozilla/5.0 (Windows NT 10.0)', 'Win32', 0))).toBe(false)
    expect(isIos(nav('Mozilla/5.0 (Macintosh)', 'MacIntel', 0))).toBe(false)
  })
})
