import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { deferredPrompt, installed } from '../../pwa/installPrompt'
import type { BeforeInstallPromptEvent } from '../../pwa/installPrompt'
import InstallButton from './InstallButton.vue'

function fakePrompt(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt') as BeforeInstallPromptEvent
  event.prompt = vi.fn().mockResolvedValue(undefined)
  event.userChoice = Promise.resolve({ outcome })
  return event
}

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'

beforeEach(() => {
  deferredPrompt.value = null
  installed.value = false
})
afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(navigator, 'userAgent')
})

describe('InstallButton', () => {
  it("n'affiche rien quand l'installation n'est pas possible (ex: Firefox bureau)", () => {
    expect(mount(InstallButton).find('button').exists()).toBe(false)
  })

  it("n'affiche rien quand l'application est déjà installée", () => {
    installed.value = true
    deferredPrompt.value = fakePrompt()
    expect(mount(InstallButton).find('button').exists()).toBe(false)
  })

  it("apparaît dès que le navigateur peut installer l'application", async () => {
    const wrapper = mount(InstallButton)
    expect(wrapper.find('button').exists()).toBe(false)
    deferredPrompt.value = fakePrompt()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('button').text()).toContain('Installer')
  })

  it("un clic ouvre l'installation native, puis le bouton disparaît une fois installée", async () => {
    const event = fakePrompt('accepted')
    deferredPrompt.value = event
    const wrapper = mount(InstallButton)
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(event.prompt).toHaveBeenCalledTimes(1)
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it("si l'utilisateur refuse, le bouton disparaît sans erreur (le navigateur redonnera la main plus tard)", async () => {
    deferredPrompt.value = fakePrompt('dismissed')
    const wrapper = mount(InstallButton)
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(installed.value).toBe(false)
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('sur iPhone, montre le chemin « Partager → Sur l\'écran d\'accueil » au lieu d\'une invite', async () => {
    Object.defineProperty(navigator, 'userAgent', { value: IPHONE, configurable: true })
    const wrapper = mount(InstallButton)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    await wrapper.find('button').trigger('click')
    expect(wrapper.find('button').attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('[role="dialog"]').text()).toContain("Sur l'écran d'accueil")

    await wrapper.find('button[aria-label="Fermer l\'aide"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })
})
