import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ToggleSwitch from './ToggleSwitch.vue'

describe('ToggleSwitch', () => {
  it('affiche le libellé et reflète modelValue', () => {
    const wrapper = mount(ToggleSwitch, { props: { modelValue: true, label: 'Points communes' } })
    expect(wrapper.text()).toContain('Points communes')
    expect((wrapper.find('input').element as HTMLInputElement).checked).toBe(true)
  })

  it('émet update:modelValue au clic', async () => {
    const wrapper = mount(ToggleSwitch, { props: { modelValue: false, label: 'Test' } })
    await wrapper.find('input').setValue(true)
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
  })
})
