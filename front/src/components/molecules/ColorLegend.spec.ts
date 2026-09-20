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

  it('précise « ≥ » quand l\'échelle est plafonnée (valeurs au-delà = couleur la plus foncée)', () => {
    const ticks = mount(ColorLegend, { props: { max: 2679, label: 'X', capped: true } }).findAll('.color-legend__ticks span')
    expect(ticks[1]!.text().replace(/\s/g, '')).toBe('≥2679')
    const normal = mount(ColorLegend, { props: { max: 2679, label: 'X' } }).findAll('.color-legend__ticks span')
    expect(normal[1]!.text()).not.toContain('≥')
  })

  it('garde une décimale sous 10 (densité : « 3,4 » pour 100 000 hab., pas « 3 »)', () => {
    const ticks = mount(ColorLegend, { props: { max: 3.4567, label: 'X' } }).findAll('.color-legend__ticks span')
    expect(ticks[1]!.text()).toBe('3,5')
  })

  it('arrondit à l\'entier au-delà de 10 (une densité de 187,4 s\'affiche « 187 »)', () => {
    const ticks = mount(ColorLegend, { props: { max: 187.4, label: 'X' } }).findAll('.color-legend__ticks span')
    expect(ticks[1]!.text()).toBe('187')
  })
})
