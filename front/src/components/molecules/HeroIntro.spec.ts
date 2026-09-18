import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import HeroIntro from './HeroIntro.vue'

describe('HeroIntro', () => {
  it("pose la question du site en titre principal (l'unique h1 de la page)", () => {
    const wrapper = mount(HeroIntro)
    expect(wrapper.findAll('h1')).toHaveLength(1)
    expect(wrapper.find('h1').text()).toContain('Où sont les professionnels de santé')
    expect(wrapper.find('section').attributes('aria-labelledby')).toBe('hero-title')
    expect(wrapper.find('h1').attributes('id')).toBe('hero-title')
  })

  it("présente les trois usages : chercher par ville, voir la densité, voir la répartition", () => {
    const features = mount(HeroIntro).findAll('.hero__feature')
    expect(features.map((f) => f.find('strong').text())).toEqual(['Chercher par ville', 'Voir la densité', 'Voir la répartition'])
  })

  it("mentionne les DOM-TOM (ils figurent sur la carte)", () => {
    expect(mount(HeroIntro).text()).toContain('DOM-TOM')
  })

  it('a une décoration masquée aux lecteurs d\'écran', () => {
    expect(mount(HeroIntro).find('.hero__pulse').attributes('aria-hidden')).toBe('true')
  })
})
