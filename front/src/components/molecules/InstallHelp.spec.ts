import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import InstallHelp from './InstallHelp.vue'

describe('InstallHelp', () => {
  it("explique les trois étapes d'installation sur iPhone / iPad", () => {
    const wrapper = mount(InstallHelp)
    expect(wrapper.find('[role="dialog"]').attributes('aria-label')).toContain('écran d\'accueil')
    expect(wrapper.findAll('li')).toHaveLength(3)
    expect(wrapper.text()).toContain('Partager')
    expect(wrapper.text()).toContain("Sur l'écran d'accueil")
    expect(wrapper.text()).toContain('Ajouter')
  })

  it('se ferme avec le bouton', async () => {
    const wrapper = mount(InstallHelp)
    await wrapper.find('button[aria-label="Fermer l\'aide"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it("se ferme avec Échap, et cesse d'écouter une fois démontée", () => {
    const onClose = vi.fn()
    const wrapper = mount(InstallHelp, { props: { onClose }, attachTo: document.body })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    wrapper.unmount()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
