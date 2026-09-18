import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import InfoRow from './InfoRow.vue'

describe('InfoRow', () => {
  it('affiche le libellé et la valeur', () => {
    const wrapper = mount(InfoRow, { props: { label: 'Profession', value: 'Infirmier' } })
    expect(wrapper.find('dt').text()).toBe('Profession')
    expect(wrapper.find('dd').text()).toBe('Infirmier')
    expect(wrapper.find('[data-missing]').exists()).toBe(false)
  })

  it.each([null, undefined, ''])('indique clairement « Non renseigné » quand la valeur est %j', (value) => {
    const wrapper = mount(InfoRow, { props: { label: 'Téléphone', value } })
    expect(wrapper.find('dt').text()).toBe('Téléphone')
    expect(wrapper.find('[data-missing]').text()).toBe('Non renseigné')
  })

  it('utilise le slot pour une valeur mise en forme (lien, numéro formaté...)', () => {
    const wrapper = mount(InfoRow, {
      props: { label: 'E-mail', value: 'a@b.fr' },
      slots: { default: '<a href="mailto:a@b.fr">a@b.fr</a>' },
    })
    expect(wrapper.find('dd a').attributes('href')).toBe('mailto:a@b.fr')
  })

  it('ne rend pas le slot quand la valeur est absente (pas de lien vide)', () => {
    const wrapper = mount(InfoRow, { props: { label: 'E-mail', value: null }, slots: { default: '<a href="mailto:">x</a>' } })
    expect(wrapper.find('a').exists()).toBe(false)
    expect(wrapper.find('[data-missing]').exists()).toBe(true)
  })

  it('peut occuper toute la largeur de la grille (adresse, libellés longs)', () => {
    expect(mount(InfoRow, { props: { label: 'Adresse', value: 'x', wide: true } }).classes()).toContain('info-row--wide')
    expect(mount(InfoRow, { props: { label: 'Adresse', value: 'x' } }).classes()).not.toContain('info-row--wide')
  })

  describe('copie', () => {
    it('ne propose aucun bouton de copie par défaut', () => {
      expect(mount(InfoRow, { props: { label: 'Rôle', value: 'x' } }).find('button').exists()).toBe(false)
    })

    it("propose un bouton dont le nom reprend le libellé, ou un nom explicite", () => {
      expect(mount(InfoRow, { props: { label: 'SIRET', value: '1', copy: '1' } }).find('button').attributes('aria-label')).toBe('Copier siret')
      expect(
        mount(InfoRow, { props: { label: 'Adresse', value: 'x', copy: 'x, 69890', copyLabel: "l'adresse complète" } }).find('button').attributes('aria-label'),
      ).toBe("Copier l'adresse complète")
    })

    it('ne propose rien à copier quand la valeur est absente (seulement « Non renseigné »)', () => {
      const wrapper = mount(InfoRow, { props: { label: 'Téléphone', value: null, copy: '0467336733' } })
      expect(wrapper.find('button').exists()).toBe(false)
      expect(wrapper.find('[data-missing]').text()).toBe('Non renseigné')
    })
  })
})

