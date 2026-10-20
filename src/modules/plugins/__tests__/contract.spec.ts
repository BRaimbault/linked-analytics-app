import { isHighlighted } from '@modules/plugins/contract'
import { describe, expect, it } from 'vitest'

const point = { ou: { id: 'north' }, pe: { id: '2025' } }

describe('highlight', () => {
    it('keeps every point in view without a highlight, or an empty one', () => {
        expect(isHighlighted(undefined, point)).toBe(true)
        expect(isHighlighted({ ou: [] }, point)).toBe(true)
    })

    it('keeps a point whose items are all highlighted, or not on its axes', () => {
        expect(isHighlighted({ ou: ['north'] }, point)).toBe(true)
        expect(isHighlighted({ ou: ['north'], dx: ['anc'] }, point)).toBe(true)
        expect(isHighlighted({ ou: ['south'] }, point)).toBe(false)
        expect(isHighlighted({ ou: ['north'], pe: ['2026'] }, point)).toBe(
            false
        )
    })
})
