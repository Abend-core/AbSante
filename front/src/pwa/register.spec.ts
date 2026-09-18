import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerServiceWorker } from './register'

afterEach(() => vi.restoreAllMocks())

function fakeWindow() {
  const listeners: Record<string, () => void> = {}
  return { addEventListener: vi.fn((type: string, cb: () => void) => (listeners[type] = cb)), listeners }
}

describe('registerServiceWorker', () => {
  it("enregistre /sw.js une fois la page chargée (pas avant, pour ne pas la ralentir)", () => {
    const register = vi.fn().mockResolvedValue({})
    const win = fakeWindow()
    registerServiceWorker({ serviceWorker: { register } }, win as unknown as Window)
    expect(register).not.toHaveBeenCalled()
    win.listeners.load!()
    expect(register).toHaveBeenCalledWith('/sw.js')
  })

  it("ne fait rien dans un navigateur sans service workers", () => {
    const win = fakeWindow()
    registerServiceWorker({}, win as unknown as Window)
    expect(win.addEventListener).not.toHaveBeenCalled()
  })

  it("un échec d'enregistrement est signalé en console sans jamais gêner l'application", async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const win = fakeWindow()
    registerServiceWorker({ serviceWorker: { register: vi.fn().mockRejectedValue(new Error('SecurityError')) } }, win as unknown as Window)
    expect(() => win.listeners.load!()).not.toThrow()
    await Promise.resolve()
    await Promise.resolve()
    expect(warn).toHaveBeenCalled()
  })
})
