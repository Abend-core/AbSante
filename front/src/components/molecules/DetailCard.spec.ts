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

  it('affiche la liste des praticiens quand fournie', () => {
    const wrapper = mount(DetailCard, {
      props: {
        detail: {
          nom: 'CH Grandville',
          n: 1,
          praticiens: [{ nom: 'Poulteau', prenom: 'Sylvain', profession: 'Médecin' }],
        },
        unit: 'praticiens',
        hint: 'Cliquez un point',
      },
    })
    expect(wrapper.text()).toContain('Sylvain Poulteau')
    expect(wrapper.text()).toContain('Médecin')
  })

  it('affiche la liste des établissements et émet "select-etablissement" au clic (pas de praticiens listés directement)', async () => {
    const chGrandville = {
      nom: 'CH Grandville',
      coords: null,
      praticiens: [{ nom: 'Dupont', prenom: 'Jean', profession: 'Médecin' }],
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
