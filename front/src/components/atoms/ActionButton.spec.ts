import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ActionButton from './ActionButton.vue'

describe('ActionButton', () => {
  it('est un vrai bouton (type=button : ne soumet jamais un formulaire) avec son libellé', () => {
    const button = mount(ActionButton, { slots: { default: 'Réessayer' } }).find('button')
    expect(button.attributes('type')).toBe('button')
    expect(button.text()).toBe('Réessayer')
  })

  it('émet le clic', async () => {
    const wrapper = mount(ActionButton, { slots: { default: 'Ok' } })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it.each(['primary', 'outline', 'on-navy'] as const)('applique la variante %s', (variant) => {
    expect(mount(ActionButton, { props: { variant } }).classes()).toContain(`action-button--${variant}`)
  })

  it("affiche une icône décorative seulement quand elle est demandée", () => {
    expect(mount(ActionButton, { props: { icon: 'download' } }).find('svg').attributes('aria-hidden')).toBe('true')
    expect(mount(ActionButton).find('svg').exists()).toBe(false)
  })

  it('transmet les attributs d\'accessibilité (aria-expanded...)', () => {
    expect(mount(ActionButton, { attrs: { 'aria-expanded': 'true' } }).find('button').attributes('aria-expanded')).toBe('true')
  })
})
