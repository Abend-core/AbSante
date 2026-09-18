import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SavoirFaireList from './SavoirFaireList.vue'

describe('SavoirFaireList', () => {
  it('regroupe les spécialités et compétences par type', () => {
    const wrapper = mount(SavoirFaireList, {
      props: {
        items: [
          { profession: 'Médecin', type: 'Spécialité ordinale', code: 'SM04', libelle: 'Cardiologie et maladies vasculaires' },
          { profession: 'Médecin', type: 'Compétence métier', code: 'CM0001', libelle: 'Échographie' },
          { profession: 'Médecin', type: 'Spécialité ordinale', code: 'SM26', libelle: 'Médecine générale' },
        ],
      },
    })
    const groups = wrapper.findAll('.savoir-faire__group')
    expect(groups.map((g) => g.find('h3').text())).toEqual(['Spécialité ordinale', 'Compétence métier'])
    expect(groups[0]!.findAll('li')).toHaveLength(2)
    expect(wrapper.text()).toContain('Cardiologie et maladies vasculaires')
    expect(wrapper.text()).toContain('SM04')
  })

  it('range sous « Autre » un élément sans type, et signale un libellé manquant', () => {
    const wrapper = mount(SavoirFaireList, { props: { items: [{ profession: null, type: null, code: 'X1', libelle: null }] } })
    expect(wrapper.find('h3').text()).toBe('Autre')
    expect(wrapper.find('[data-missing]').text()).toBe('Libellé non renseigné')
  })

  it("indique clairement l'absence de spécialité", () => {
    const wrapper = mount(SavoirFaireList, { props: { items: [] } })
    expect(wrapper.find('[data-missing]').text()).toContain('Non renseigné')
  })
})
