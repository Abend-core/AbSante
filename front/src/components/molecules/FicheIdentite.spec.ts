import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Fiche } from '../../types/fiche'
import FicheIdentite from './FicheIdentite.vue'

const base: Fiche = {
  id: '810006881261', identifiantPP: '10006881261', typeIdentifiant: '8', civilite: 'Madame', civiliteExercice: null,
  nom: 'BRUN', prenom: 'SOLENNE', activites: [], savoirFaire: [], diplomes: [], misAJourLe: null,
}

describe('FicheIdentite', () => {
  it("affiche l'identité et l'identifiant national", () => {
    const text = mount(FicheIdentite, { props: { fiche: base } }).text()
    expect(text).toContain('BRUN')
    expect(text).toContain('Solenne') // prénom remis en forme
    expect(text).toContain('810006881261')
    expect(text).toContain('10006881261')
  })

  it("marque « Non renseigné » la civilité d'exercice absente, et seulement elle", () => {
    const wrapper = mount(FicheIdentite, { props: { fiche: base } })
    const missing = wrapper.findAll('[data-missing]')
    expect(missing).toHaveLength(1)
    expect(missing[0]!.element.closest('.info-row')!.textContent).toContain("Civilité d'exercice")
  })

  it('marque toutes les informations absentes quand le RPPS ne donne presque rien', () => {
    const wrapper = mount(FicheIdentite, {
      props: { fiche: { ...base, civilite: null, nom: null, prenom: null, identifiantPP: null, typeIdentifiant: null } },
    })
    expect(wrapper.findAll('[data-missing]')).toHaveLength(6) // tout sauf l'identifiant national
  })

  it("propose de copier l'identifiant RPPS et l'identifiant PP, pas les autres champs", () => {
    const wrapper = mount(FicheIdentite, { props: { fiche: { ...base, identifiantPP: '10110323986' } } })
    expect(wrapper.findAll('.copy-button__button').map((b) => b.attributes('aria-label'))).toEqual([
      "Copier l'identifiant RPPS",
      'Copier identifiant pp',
    ])
  })
})

