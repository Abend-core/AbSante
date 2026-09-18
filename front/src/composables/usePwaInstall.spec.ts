import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deferredPrompt, installed } from '../pwa/installPrompt'
import type { BeforeInstallPromptEvent } from '../pwa/installPrompt'
import { usePwaInstall } from './usePwaInstall'

function fakePrompt(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt') as BeforeInstallPromptEvent
  event.prompt = vi.fn().mockResolvedValue(undefined)
  event.userChoice = Promise.resolve({ outcome })
  return event
}

/** jsdom ne définit pas maxTouchPoints : on le pose (et le retire) explicitement. */
function setNavigator(values: { userAgent?: string; platform?: string; maxTouchPoints?: number }) {
  for (const [key, value] of Object.entries(values)) Object.defineProperty(navigator, key, { value, configurable: true })
}

beforeEach(() => {
  deferredPrompt.value = null
  installed.value = false
})
afterEach(() => {
  vi.restoreAllMocks()
  for (const key of ['userAgent', 'platform', 'maxTouchPoints']) Reflect.deleteProperty(navigator, key)
})

describe('usePwaInstall', () => {
  it("est « unavailable » tant que rien ne permet d'installer", () => {
    expect(usePwaInstall().mode.value).toBe('unavailable')
  })

  it('devient « prompt » quand le navigateur a fourni son invite', () => {
    const { mode } = usePwaInstall()
    deferredPrompt.value = fakePrompt()
    expect(mode.value).toBe('prompt')
  })

  it('est « ios » sur iPhone, iPad et iPadOS en mode bureau', () => {
    setNavigator({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)' })
    expect(usePwaInstall().mode.value).toBe('ios')

    setNavigator({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 5 })
    expect(usePwaInstall().mode.value).toBe('ios')
  })

  it("n'est pas « ios » sur un Mac sans écran tactile", () => {
    setNavigator({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 0 })
    expect(usePwaInstall().mode.value).toBe('unavailable')
  })

  it('« installed » l\'emporte sur tout le reste', () => {
    installed.value = true
    deferredPrompt.value = fakePrompt()
    expect(usePwaInstall().mode.value).toBe('installed')
  })

  it("install() ouvre l'invite native et marque l'application installée si elle est acceptée", async () => {
    const event = fakePrompt('accepted')
    deferredPrompt.value = event
    const { install, mode } = usePwaInstall()
    expect(await install()).toBe('accepted')
    expect(event.prompt).toHaveBeenCalledTimes(1)
    expect(deferredPrompt.value).toBeNull() // une invite ne sert qu'une fois
    expect(mode.value).toBe('installed')
  })

  it('install() renvoie « dismissed » si l\'utilisateur refuse, sans marquer installée', async () => {
    deferredPrompt.value = fakePrompt('dismissed')
    const { install } = usePwaInstall()
    expect(await install()).toBe('dismissed')
    expect(installed.value).toBe(false)
  })

  it("install() renvoie « unavailable » sans invite disponible, et sans lever d'erreur", async () => {
    expect(await usePwaInstall().install()).toBe('unavailable')
  })

  it("install() absorbe une erreur de l'invite native", async () => {
    const event = fakePrompt()
    event.prompt = vi.fn().mockRejectedValue(new Error('InvalidStateError'))
    deferredPrompt.value = event
    expect(await usePwaInstall().install()).toBe('unavailable')
  })
})
