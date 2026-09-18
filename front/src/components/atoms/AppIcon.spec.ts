import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppIcon from './AppIcon.vue'
import type { IconName } from './AppIcon.vue'

const NAMES: IconName[] = ['search', 'layers', 'pin', 'arrow-left', 'github', 'phone', 'mail', 'external', 'copy', 'check', 'download', 'close', 'share']

describe('AppIcon', () => {
  it.each(NAMES)("dessine l'icône %s (un tracé non vide)", (name) => {
    const wrapper = mount(AppIcon, { props: { name } })
    expect(wrapper.find('path').attributes('d')).toMatch(/^M/)
  })

  it('est décorative : masquée aux lecteurs d\'écran et non focalisable', () => {
    const svg = mount(AppIcon, { props: { name: 'pin' } }).find('svg')
    expect(svg.attributes('aria-hidden')).toBe('true')
    expect(svg.attributes('focusable')).toBe('false')
  })

  it('a une taille par défaut et accepte une taille explicite', () => {
    expect(mount(AppIcon, { props: { name: 'pin' } }).find('svg').attributes('width')).toBe('18')
    expect(mount(AppIcon, { props: { name: 'pin', size: 30 } }).find('svg').attributes('height')).toBe('30')
  })
})
