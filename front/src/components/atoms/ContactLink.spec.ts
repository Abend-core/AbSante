import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ContactLink from './ContactLink.vue'

describe('ContactLink', () => {
  it('compose un lien tel: sans espaces et affiche le numéro mis en forme', () => {
    const link = mount(ContactLink, { props: { kind: 'phone', value: '04 67 33 67 33', display: '04 67 33 67 33' } }).find('a')
    expect(link.attributes('href')).toBe('tel:0467336733')
    expect(link.text()).toBe('04 67 33 67 33')
  })

  it('compose un lien mailto: et affiche l\'adresse par défaut', () => {
    const link = mount(ContactLink, { props: { kind: 'mail', value: 'cabinet@example.org' } }).find('a')
    expect(link.attributes('href')).toBe('mailto:cabinet@example.org')
    expect(link.text()).toBe('cabinet@example.org')
  })

  it("a une icône décorative adaptée au type", () => {
    const phone = mount(ContactLink, { props: { kind: 'phone', value: '0467336733' } }).find('svg path').attributes('d')
    const mail = mount(ContactLink, { props: { kind: 'mail', value: 'a@b.fr' } }).find('svg path').attributes('d')
    expect(phone).not.toBe(mail)
  })
})
