import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DiplomeList from './DiplomeList.vue'

describe('DiplomeList', () => {
  it('affiche chaque diplôme avec ses informations, et « Non renseigné » pour les manquantes', () => {
    const wrapper = mount(DiplomeList, {
      props: {
        items: [
          { type: 'Autre type de diplôme', code: 'DIP348', libelle: 'Diplôme Technicien Laboratoire arrêté 21/10/1992', typeAutorisation: null, disciplineAutorisation: null },
        ],
      },
    })
    expect(wrapper.text()).toContain('Diplôme Technicien Laboratoire arrêté 21/10/1992')
    expect(wrapper.text()).toContain('DIP348')
    // type d'autorisation et discipline absents -> 2 mentions explicites
    expect(wrapper.findAll('[data-missing]')).toHaveLength(2)
  })

  it('liste plusieurs diplômes', () => {
    const item = { type: 'DE', code: 'DE09', libelle: 'Infirmier', typeAutorisation: 'AE', disciplineAutorisation: 'Soins' }
    expect(mount(DiplomeList, { props: { items: [item, { ...item, code: 'DE10' }] } }).findAll('.diplome')).toHaveLength(2)
  })

  it("indique clairement l'absence de diplôme", () => {
    const wrapper = mount(DiplomeList, { props: { items: [] } })
    expect(wrapper.find('.diplome').exists()).toBe(false)
    expect(wrapper.find('[data-missing]').text()).toContain('Non renseigné')
  })
})
