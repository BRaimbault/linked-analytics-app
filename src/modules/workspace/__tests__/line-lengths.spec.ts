import { describe, expect, it } from 'vitest'
import { fitToMinimums } from '../line-lengths'

describe('fitToMinimums', () => {
    it('raises lengths below their minimum and shares the rest in proportion', () => {
        expect(fitToMinimums([900, 100, 200], [100, 200, 100], 1200)).toEqual([
            (1000 * 900) / 1100,
            200,
            (1000 * 200) / 1100,
        ])
    })

    it('keeps raising lengths until every one fits', () => {
        expect(fitToMinimums([1000, 150, 250], [100, 200, 240], 1200)).toEqual([
            760, 200, 240,
        ])
    })

    it('shares the rest equally when the others had no length', () => {
        expect(fitToMinimums([0, 0, 0], [100, 100, 0], 300)).toEqual([
            100, 100, 100,
        ])
    })

    it('leaves the lengths to the grid when even the minimums do not fit', () => {
        expect(fitToMinimums([100, 100], [200, 200], 300)).toEqual([100, 100])
    })
})
