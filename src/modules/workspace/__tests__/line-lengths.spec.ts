import { fitToMinimums, roundToTotal } from '@modules/workspace/line-lengths'
import { describe, expect, it } from 'vitest'

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

    it('fits lengths when the minimums exactly fill the total', () => {
        expect(fitToMinimums([100, 300], [200, 200], 400)).toEqual([200, 200])
    })
})

describe('roundToTotal', () => {
    it('gives the last length what is left, so the lengths add up', () => {
        /* e.g. lengths left as they were, when even the minimums don't fit */
        expect(roundToTotal([100, 100], 205)).toEqual([100, 105])
        expect(roundToTotal([100.4, 100.4, 100.4], 301)).toEqual([
            100, 101, 100,
        ])
    })
})
