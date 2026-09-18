import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ColorLegend from './ColorLegend.vue'

describe('ColorLegend', () => {
  it('affiche le libellé et la valeur maximum formatée', () => {
    const wrapper = mount(ColorLegend, { props: { max: 12345, label: 'Praticiens par département' } })
    expect(wrapper.text()).toContain('Praticiens par département')
    // Le séparateur de milliers fr-FR dépend de l'ICU du runtime (espace normale
    // ou insécable) -> on ne teste pas le caractère exact, juste les chiffres.
    expect(wrapper.text().replace(/\s/g, '')).toContain('12345')
  })

  it('affiche toujours 0 comme borne basse', () => {
    const wrapper = mount(ColorLegend, { props: { max: 100, label: 'X' } })
    const ticks = wrapper.findAll('.color-legend__ticks span')
    expect(ticks[0]!.text()).toBe('0')
    expect(ticks[1]!.text()).toBe('100')
  })
})
