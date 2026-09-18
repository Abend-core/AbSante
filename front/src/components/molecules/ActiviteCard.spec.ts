import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Activite, Structure } from '../../types/fiche'
import ActiviteCard from './ActiviteCard.vue'

const emptyStructure: Structure = {
  cle: 'R1', raisonSociale: null, enseigne: null, siret: null, siren: null, finessSite: null, finessJuridique: null,
  complementDestinataire: null, complementPointGeographique: null, voie: null, mentionDistribution: null, bureauCedex: null,
  codePostal: null, codeCommune: null, commune: null, pays: null, telephone: null, telephone2: null, telecopie: null,
  email: null, departement: null,
}

const antagene: Activite = {
  codeProfession: '86', profession: 'Technicien de Laboratoire', categorie: 'Civil', modeExercice: 'Salarié',
  secteurActivite: 'Recherche', sectionPharmaciens: null, role: 'Salarié en poste fixe', genreActivite: null,
  structure: {
    ...emptyStructure, raisonSociale: 'ANTAGENE', siret: '44154525800036', voie: '6 ALL DU LEVANT',
    codePostal: '69890', commune: 'La Tour-de-Salvagny', pays: 'France',
  },
}

const rowText = (wrapper: ReturnType<typeof mount>, label: string) =>
  wrapper.findAll('.info-row').find((r) => r.find('dt').text() === label)?.find('dd').text()

describe('ActiviteCard', () => {
  it("affiche l'activité et son lieu d'exercice (cas réel : technicienne chez ANTAGENE)", () => {
    const wrapper = mount(ActiviteCard, { props: { activite: antagene, index: 1, total: 1 } })
    expect(rowText(wrapper, 'Mode d\'exercice')).toBe('Salarié')
    expect(rowText(wrapper, 'Raison sociale')).toBe('ANTAGENE')
    expect(rowText(wrapper, 'Adresse')).toBe('6 ALL DU LEVANT')
    expect(rowText(wrapper, 'Commune')).toBe('La Tour-de-Salvagny')
    expect(rowText(wrapper, 'SIRET')).toBe('441 545 258 00036')
  })

  it('indique « Non renseigné » pour chaque information absente (téléphone, e-mail, enseigne...)', () => {
    const wrapper = mount(ActiviteCard, { props: { activite: antagene, index: 1, total: 1 } })
    for (const label of ['Téléphone', 'Téléphone 2', 'Télécopie', 'E-mail', 'Enseigne', 'SIREN', 'FINESS (site)', 'Genre d\'activité']) {
      expect(rowText(wrapper, label), label).toBe('Non renseigné')
    }
    expect(rowText(wrapper, 'Raison sociale')).not.toBe('Non renseigné')
  })

  it('rend le téléphone cliquable et formaté, et l\'e-mail en lien mailto', () => {
    const activite = {
      ...antagene,
      structure: { ...antagene.structure!, telephone: '0467336733', email: 'cabinet@example.org' },
    }
    const wrapper = mount(ActiviteCard, { props: { activite, index: 1, total: 1 } })
    const tel = wrapper.find('a[href^="tel:"]')
    expect(tel.attributes('href')).toBe('tel:0467336733')
    expect(tel.text()).toBe('04 67 33 67 33')
    expect(wrapper.find('a[href^="mailto:"]').attributes('href')).toBe('mailto:cabinet@example.org')
  })

  it("dit clairement quand l'activité n'a aucun lieu d'exercice", () => {
    const wrapper = mount(ActiviteCard, { props: { activite: { ...antagene, structure: null }, index: 1, total: 1 } })
    expect(wrapper.find('[data-testid="structure"]').exists()).toBe(false)
    expect(wrapper.find('.activite-card__no-structure').text()).toContain('Non renseigné')
  })

  it("numérote les activités seulement quand il y en a plusieurs", () => {
    expect(mount(ActiviteCard, { props: { activite: antagene, index: 2, total: 3 } }).text()).toContain('Activité 2 sur 3')
    expect(mount(ActiviteCard, { props: { activite: antagene, index: 1, total: 1 } }).text()).not.toContain('Activité 1 sur 1')
  })

  it('reste lisible sans profession', () => {
    const wrapper = mount(ActiviteCard, { props: { activite: { ...antagene, profession: null }, index: 1, total: 1 } })
    expect(wrapper.find('h3').text()).toContain('Profession non renseignée')
  })
})
