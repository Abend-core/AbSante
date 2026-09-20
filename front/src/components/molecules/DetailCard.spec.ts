import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DetailCard from './DetailCard.vue'

describe('DetailCard', () => {
  it("affiche l'indice quand il n'y a aucun détail sélectionné", () => {
    const wrapper = mount(DetailCard, {
      props: { detail: null, unit: 'praticiens', hint: 'Cliquez un point' },
    })
    expect(wrapper.text()).toContain('Cliquez un point')
  })

  it('affiche le nom et la valeur quand un détail est fourni', () => {
    const wrapper = mount(DetailCard, {
      props: {
        detail: { nom: 'Lyon', n: 42 },
        unit: 'médecins',
        hint: 'Cliquez un point',
      },
    })
    expect(wrapper.text()).toContain('Lyon')
    expect(wrapper.text()).toContain('42 médecins')
    expect(wrapper.text()).not.toContain('Cliquez un point')
  })

  it('affiche la densité pour 100 000 habitants quand elle est connue, et rien sinon', () => {
    const avec = mount(DetailCard, { props: { detail: { nom: 'Cher', n: 4890, densite: 1623.4 }, unit: 'praticiens', hint: '' } })
    expect(avec.text().replace(/\s+/g, ' ')).toContain('pour 100 000 hab.')
    expect(avec.text().replace(/\s/g, '')).toContain('1623pour100000hab.')
    const sans = mount(DetailCard, { props: { detail: { nom: 'Lyon', n: 42 }, unit: 'médecins', hint: '' } })
    expect(sans.text()).not.toContain('100 000')
  })

  it('affiche la liste des praticiens quand fournie', () => {
    const wrapper = mount(DetailCard, {
      props: {
        detail: {
          nom: 'CH Grandville',
          n: 1,
          praticiens: [{ nom: 'Poulteau', prenom: 'Sylvain', profession: 'Médecin', id: '810001234567' }],
        },
        unit: 'praticiens',
        hint: 'Cliquez un point',
      },
    })
    expect(wrapper.text()).toContain('Sylvain Poulteau')
    expect(wrapper.text()).toContain('Médecin')
  })

  it("propose pour chaque praticien un lien « Voir la fiche » qui s'ouvre dans un nouvel onglet", () => {
    const wrapper = mount(DetailCard, {
      props: {
        detail: {
          nom: 'ANTAGENE (La Tour-de-Salvagny)',
          n: 2,
          praticiens: [
            { nom: 'BRUN', prenom: 'SOLENNE', profession: 'Technicien de Laboratoire', id: '810006881261' },
            { nom: 'BRUN', prenom: 'SOLENNE', profession: 'Infirmier', id: '810110323986' },
          ],
        },
        unit: 'praticiens',
        hint: '',
      },
    })
    const links = wrapper.findAll('a.detail-card__fiche')
    expect(links).toHaveLength(2)
    // Deux homonymes : chacun pointe vers SA fiche (identifiant national, pas le nom)
    expect(links.map((l) => l.attributes('href'))).toEqual(['/praticien/810006881261', '/praticien/810110323986'])
    for (const link of links) {
      expect(link.attributes('target')).toBe('_blank')
      expect(link.attributes('rel')).toContain('noopener')
      expect(link.text()).toBe('Voir la fiche')
    }
  })

  it('affiche la liste des établissements et émet "select-etablissement" au clic (pas de praticiens listés directement)', async () => {
    const chGrandville = {
      nom: 'CH Grandville',
      coords: null,
      praticiens: [{ nom: 'Dupont', prenom: 'Jean', profession: 'Médecin', id: '810007654321' }],
    }
    const wrapper = mount(DetailCard, {
      props: {
        detail: { nom: 'Andrézieux-Bouthéon', n: 242, etablissements: [chGrandville] },
        unit: 'praticiens',
        hint: 'Cliquez un point',
      },
    })
    expect(wrapper.text()).toContain('CH Grandville')
    expect(wrapper.text()).toContain('1 praticien(s)')
    expect(wrapper.text()).not.toContain('Jean Dupont')

    await wrapper.find('.detail-card__etablissements button').trigger('click')
    expect(wrapper.emitted('select-etablissement')?.[0]).toEqual([chGrandville])
  })
})
