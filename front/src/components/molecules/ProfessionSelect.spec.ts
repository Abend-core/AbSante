import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ProfessionSelect from './ProfessionSelect.vue'

describe('ProfessionSelect', () => {
  it('liste "Toutes les professions" puis chaque profession', () => {
    const wrapper = mount(ProfessionSelect, {
      props: { modelValue: 'Tous', professions: ['Médecin', 'Infirmier'] },
    })
    const options = wrapper.findAll('option')
    expect(options).toHaveLength(3)
    expect(options[0]!.attributes('value')).toBe('Tous')
    expect(options[1]!.text()).toBe('Médecin')
    expect(options[2]!.text()).toBe('Infirmier')
  })

  it('émet update:modelValue quand on change de profession', async () => {
    const wrapper = mount(ProfessionSelect, {
      props: { modelValue: 'Tous', professions: ['Médecin', 'Infirmier'] },
    })
    await wrapper.find('select').setValue('Médecin')
    expect(wrapper.emitted('update:modelValue')).toEqual([['Médecin']])
  })
})
