import { beforeEach, describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { deferredPrompt, installed } from '../../pwa/installPrompt'
import type { BeforeInstallPromptEvent } from '../../pwa/installPrompt'
import SiteHeader from './SiteHeader.vue'

const mountHeader = () => mount(SiteHeader, { global: { stubs: { RouterLink: RouterLinkStub } } })

beforeEach(() => {
  deferredPrompt.value = null
  installed.value = false
})

describe('SiteHeader', () => {
  it("affiche le nom et renvoie à l'accueil depuis le logo", () => {
    const wrapper = mountHeader()
    expect(wrapper.text()).toContain('AbSante')
    const brand = wrapper.findAllComponents(RouterLinkStub).find((l) => l.classes().includes('site-header__brand'))!
    expect(brand.props('to')).toBe('/')
    expect(brand.attributes('aria-label')).toContain('AbSante')
  })

  it('propose la navigation vers la carte', () => {
    expect(mountHeader().find('nav').attributes('aria-label')).toBe('Navigation principale')
  })

  it('ne contient plus le lien vers le code source (réservé au pied de page)', () => {
    const wrapper = mountHeader()
    expect(wrapper.text()).not.toMatch(/code source/i)
    expect(wrapper.find('a[href*="github"]').exists()).toBe(false)
  })

  it("montre le bouton d'installation seulement quand l'application peut être installée", async () => {
    const wrapper = mountHeader()
    expect(wrapper.text()).not.toContain('Installer')
    const event = new Event('beforeinstallprompt') as BeforeInstallPromptEvent
    event.prompt = async () => {}
    event.userChoice = Promise.resolve({ outcome: 'accepted' })
    deferredPrompt.value = event
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.install-button button').text()).toContain('Installer')
  })
})
