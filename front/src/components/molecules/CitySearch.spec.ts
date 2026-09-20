import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CitySearch from './CitySearch.vue'

const COMMUNES = [
  { codeInsee: '18033', nom: 'Bourges', lat: 47.08, lon: 2.4, dept: '18', total: 2407 },
  { codeInsee: '36044', nom: 'Châteauroux', lat: 46.81, lon: 1.69, dept: '36', total: 1200 },
  { codeInsee: '75056', nom: 'Paris', lat: 48.85, lon: 2.35, dept: '75', total: 40000 },
]

describe('CitySearch', () => {
  it("ne propose rien tant qu'on n'a pas tapé au moins 2 caractères", async () => {
    const wrapper = mount(CitySearch, { props: { communes: COMMUNES } })
    await wrapper.find('input').setValue('b')
    await wrapper.find('input').trigger('focus')
    expect(wrapper.findAll('.city-search__suggestions li')).toHaveLength(0)
  })

  it('propose les villes correspondantes, insensible aux accents et à la casse', async () => {
    const wrapper = mount(CitySearch, { props: { communes: COMMUNES } })
    await wrapper.find('input').setValue('chateauro')
    await wrapper.find('input').trigger('focus')
    const items = wrapper.findAll('.city-search__suggestions li')
    expect(items).toHaveLength(1)
    expect(items[0]!.text()).toContain('Châteauroux')
  })

  it.each([
    ['tour de salvagny', 'La Tour-de-Salvagny'],
    ['la  tour-de-salvagny', 'La Tour-de-Salvagny'],
    ['l aigle', "L'Aigle"],
    ["l'aigle", "L'Aigle"],
  ])('tape « %s » -> trouve « %s » (espaces, tirets et apostrophes équivalents)', async (typed, expected) => {
    const wrapper = mount(CitySearch, {
      props: { communes: [...COMMUNES, { codeInsee: '69250', nom: 'La Tour-de-Salvagny', dept: '69', lat: 45.8, lon: 4.7, total: 500 }, { codeInsee: '61001', nom: "L'Aigle", dept: '61', lat: 48.7, lon: 0.6, total: 100 }] },
    })
    await wrapper.find('input').setValue(typed)
    await wrapper.find('input').trigger('focus')
    expect(wrapper.findAll('.city-search__suggestions li').map((li) => li.text())).toEqual([expect.stringContaining(expected)])
  })

  it('émet "select" avec la commune choisie et vide la recherche', async () => {
    const wrapper = mount(CitySearch, { props: { communes: COMMUNES } })
    await wrapper.find('input').setValue('bourges')
    await wrapper.find('input').trigger('focus')
    await wrapper.find('.city-search__suggestions button').trigger('mousedown')

    expect(wrapper.emitted('select')?.[0]).toEqual([COMMUNES[0]])
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
  })

  it('propose de nouveau des suggestions si on retape juste après avoir choisi une ville (sans perdre le focus)', async () => {
    // Le clic sur une suggestion utilise mousedown.prevent pour ne PAS faire perdre
    // le focus à l'input (sinon le clic serait annulé par le blur) -> l'input ne
    // redéclenche donc jamais d'événement "focus" tant qu'on ne clique pas ailleurs.
    // La liste doit quand même se rouvrir en continuant à taper.
    const wrapper = mount(CitySearch, { props: { communes: COMMUNES } })
    await wrapper.find('input').setValue('bourges')
    await wrapper.find('input').trigger('focus')
    await wrapper.find('.city-search__suggestions button').trigger('mousedown')

    await wrapper.find('input').setValue('chateauro') // pas de nouveau "focus" ici
    const items = wrapper.findAll('.city-search__suggestions li')
    expect(items).toHaveLength(1)
    expect(items[0]!.text()).toContain('Châteauroux')
  })
})
