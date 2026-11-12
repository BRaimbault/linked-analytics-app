import { DEMO_SELECTOR_ITEMS } from '@modules/demo/selector-items'
import { describe, expect, it } from 'vitest'

describe('demo selector items', () => {
    it('lists the years, quarters and weeks from 2025, latest first, for weeks sent to monthly data', () => {
        const ids = DEMO_SELECTOR_ITEMS.pe.map(({ id }) => id)

        expect(ids.slice(0, 4)).toEqual(['2026', '2025', '2026Q3', '2026Q2'])
        expect(ids).toContain('2026W35')
        expect(ids.at(-1)).toBe('2025W1')
        expect(ids.some((id) => /^\d{6}$/.test(id))).toBe(false)
    })
})
