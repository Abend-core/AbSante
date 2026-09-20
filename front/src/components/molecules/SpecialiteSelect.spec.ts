import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SpecialiteSelect from './SpecialiteSelect.vue'

const SPECIALITES = [
  { nom: 'Cardiologie', total: 10013 },
  { nom: 'Pédiatrie', total: 812 },
]

describe('SpecialiteSelect', () => {
  it('propose « toutes » puis chaque spécialité avec son effectif', () => {
    const options = mount(SpecialiteSelect, { props: { modelValue: null, specialites: SPECIALITES } }).findAll('option')
    expect(options.map((o) => o.text())).toEqual(['Toutes les spécialités', expect.stringMatching(/^Cardiologie \(10\s?013\)$/), 'Pédiatrie (812)'])
  })

  it('sélectionne « toutes » quand aucune spécialité n\'est choisie', () => {
    const select = mount(SpecialiteSelect, { props: { modelValue: null, specialites: SPECIALITES } }).find('select')
    expect(select.element.value).toBe('')
  })

  it('remonte le libellé choisi, et null pour « toutes »', async () => {
    const wrapper = mount(SpecialiteSelect, { props: { modelValue: null, specialites: SPECIALITES } })
    await wrapper.find('select').setValue('Pédiatrie')
    await wrapper.find('select').setValue('')
    expect(wrapper.emitted('update:modelValue')).toEqual([['Pédiatrie'], [null]])
  })
})
