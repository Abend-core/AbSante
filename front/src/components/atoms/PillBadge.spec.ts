import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PillBadge from './PillBadge.vue'

describe('PillBadge', () => {
  it('affiche son contenu', () => {
    expect(mount(PillBadge, { slots: { default: 'Salarié' } }).text()).toBe('Salarié')
  })

  it.each(['solid', 'soft', 'glass', 'chip', 'count', 'missing'] as const)('applique la variante %s', (variant) => {
    expect(mount(PillBadge, { props: { variant } }).classes()).toContain(`badge--${variant}`)
  })

  it('est « soft » par défaut', () => {
    expect(mount(PillBadge).classes()).toContain('badge--soft')
  })

  it('laisse passer les attributs (ex: data-missing pour « Non renseigné »)', () => {
    const wrapper = mount(PillBadge, { props: { variant: 'missing' }, attrs: { 'data-missing': '' } })
    expect(wrapper.attributes()).toHaveProperty('data-missing')
  })
})
