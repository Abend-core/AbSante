import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ExternalLink from './ExternalLink.vue'

describe('ExternalLink', () => {
  it("s'ouvre dans un nouvel onglet sans donner accès à la page d'origine", () => {
    const link = mount(ExternalLink, { props: { href: 'https://example.org/' }, slots: { default: 'Exemple' } }).find('a')
    expect(link.attributes('href')).toBe('https://example.org/')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
    expect(link.text()).toBe('Exemple')
  })
})
