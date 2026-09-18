import { describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import type { Activite, Fiche } from '../../types/fiche'
import FicheHeader from './FicheHeader.vue'

const activite = (profession: string | null, commune: string | null, codePostal: string | null): Activite => ({
  codeProfession: null, profession, categorie: null, modeExercice: null, secteurActivite: null, sectionPharmaciens: null, role: null,
  genreActivite: null,
  structure: commune
    ? {
        cle: `c-${commune}`, raisonSociale: null, enseigne: null, siret: null, siren: null, finessSite: null, finessJuridique: null,
        complementDestinataire: null, complementPointGeographique: null, voie: null, mentionDistribution: null, bureauCedex: null,
        codePostal, codeCommune: null, commune, pays: null, telephone: null, telephone2: null, telecopie: null, email: null, departement: null,
      }
    : null,
})

const base: Fiche = {
  id: '810110323986', identifiantPP: null, typeIdentifiant: null, civilite: 'Madame', civiliteExercice: null, nom: 'BRUN', prenom: 'SOLENNE',
  activites: [], savoirFaire: [], diplomes: [], misAJourLe: '2026-09-18T20:51:21.551Z',
}

const mountHeader = (fiche: Fiche) => mount(FicheHeader, { props: { fiche }, global: { stubs: { RouterLink: RouterLinkStub } } })

describe('FicheHeader', () => {
  it('affiche le nom complet, les initiales, l\'identifiant et la date', () => {
    const wrapper = mountHeader(base)
    expect(wrapper.find('h1').text()).toBe('Madame Solenne BRUN')
    expect(wrapper.find('.fiche-header__avatar').text()).toBe('SB')
    expect(wrapper.text()).toContain('Identifiant RPPS 810110323986')
    expect(wrapper.text()).toContain('Fiche mise à jour le 18 septembre 2026')
  })

  it('renvoie à la carte', () => {
    const link = mountHeader(base).findComponent(RouterLinkStub)
    expect(link.props('to')).toBe('/')
    expect(link.text()).toContain('Retour à la carte')
  })

  it('liste les professions distinctes (une seule fois chacune) et ignore celles qui sont absentes', () => {
    const wrapper = mountHeader({
      ...base,
      activites: [activite('Infirmier', null, null), activite('Infirmier', null, null), activite('Médecin', null, null), activite(null, null, null)],
    })
    expect(wrapper.findAll('.fiche-header__professions li').map((li) => li.text())).toEqual(['Infirmier', 'Médecin'])
  })

  it("liste les communes d'exercice distinctes, trois au plus, avec le code postal quand il est connu", () => {
    const wrapper = mountHeader({
      ...base,
      activites: [
        activite('Infirmier', 'Montpellier', '34000'),
        activite('Infirmier', 'Montpellier', '34000'),
        activite('Infirmier', 'Lyon', null),
        activite('Infirmier', 'Nîmes', '30000'),
        activite('Infirmier', 'Sète', '34200'),
      ],
    })
    expect(wrapper.findAll('.fiche-header__places li').map((li) => li.text())).toEqual(['Montpellier (34000)', 'Lyon', 'Nîmes (30000)'])
  })

  it('reste sobre quand le RPPS ne donne presque rien (pas de « null », pas de listes vides)', () => {
    const wrapper = mountHeader({ ...base, civilite: null, prenom: null, nom: null, misAJourLe: null })
    expect(wrapper.find('.fiche-header__avatar').text()).toBe('?')
    expect(wrapper.find('.fiche-header__professions').exists()).toBe(false)
    expect(wrapper.find('.fiche-header__places').exists()).toBe(false)
    expect(wrapper.text()).not.toMatch(/null|undefined/)
    expect(wrapper.text()).not.toContain('mise à jour')
  })
})
