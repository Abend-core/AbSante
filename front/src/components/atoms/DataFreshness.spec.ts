import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DataFreshness from './DataFreshness.vue'

describe('DataFreshness', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-17T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it("n'affiche rien sans date", () => {
    const wrapper = mount(DataFreshness, { props: { updatedAt: null } })
    expect(wrapper.text()).toBe('')
  })

  it('affiche la date formatée quand récente (< 48h)', () => {
    const wrapper = mount(DataFreshness, { props: { updatedAt: '2026-09-17T05:00:00Z' } })
    expect(wrapper.text()).toContain('Données du')
    expect(wrapper.classes()).not.toContain('data-freshness--stale')
  })

  it('signale les données périmées (> 48h)', () => {
    const wrapper = mount(DataFreshness, { props: { updatedAt: '2026-09-10T05:00:00Z' } })
    expect(wrapper.classes()).toContain('data-freshness--stale')
  })
})
