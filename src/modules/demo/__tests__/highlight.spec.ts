import {
    isMarkedBy,
    withRelatedItems,
    withRelatedOrgUnits,
    withRelatedPeriods,
} from '@modules/demo/highlight'
import { describe, expect, it } from 'vitest'

describe('withRelatedOrgUnits', () => {
    it('adds the units containing a highlighted one, and those it contains', () => {
        const related = withRelatedOrgUnits({
            ou: ['DemoNorth01'],
            pe: ['2025'],
        })

        expect(related?.pe).toEqual(['2025'])
        expect(related?.ou?.sort()).toEqual(
            [
                'DemoLand001',
                'DemoNorth01',
                'DemoChN0101',
                'DemoChN0102',
                'DemoChN0103',
            ].sort()
        )
    })

    it('keeps a highlight without org units, or an unknown unit, as it is', () => {
        const periods = { pe: ['2025'] }

        expect(withRelatedOrgUnits(periods)).toBe(periods)
        expect(withRelatedOrgUnits(undefined)).toBeUndefined()
        expect(withRelatedOrgUnits({ ou: ['elsewhere'] })).toEqual({
            ou: ['elsewhere'],
        })
    })
})

describe('withRelatedPeriods', () => {
    it('adds the periods containing a highlighted one, and those it contains', () => {
        const related = withRelatedPeriods({ pe: ['202511'], ou: ['x'] })

        expect(related?.ou).toEqual(['x'])
        /* The quarter and year around November, and its weeks */
        expect(related?.pe).toEqual(
            expect.arrayContaining(['202511', '2025Q4', '2025', '2025W46'])
        )
        expect(related?.pe).not.toContain('202512')
    })

    it('keeps a highlight without periods, or an unknown period, as it is', () => {
        const places = { ou: ['x'] }

        expect(withRelatedPeriods(places)).toBe(places)
        expect(withRelatedPeriods({ pe: ['1999'] })).toEqual({ pe: ['1999'] })
    })

    it('relates both, as the fakes read a highlight', () => {
        const related = withRelatedItems({
            pe: ['202511'],
            ou: ['DemoNorth01'],
        })

        expect(related?.pe).toContain('2025Q4')
        expect(related?.ou).toContain('DemoLand001')
    })
})

describe('isMarkedBy', () => {
    const highlight = { pe: ['202511'], ou: ['DemoChS0101'], dx: ['x'] }

    it('marks what the highlight names, and what holds it, not its parts', () => {
        const marks = (dimension: 'ou' | 'pe' | 'dx', id: string) =>
            isMarkedBy(highlight, { dimension, id })

        expect(marks('pe', '202511')).toBe(true)
        expect(marks('pe', '2025Q4')).toBe(true)
        expect(marks('pe', '2025W46')).toBe(false)
        expect(marks('pe', '202512')).toBe(false)
        /* Harbor's district, not another */
        expect(marks('ou', 'DemoSouth01')).toBe(true)
        expect(marks('ou', 'DemoNorth01')).toBe(false)
        expect(marks('dx', 'x')).toBe(true)
        expect(marks('dx', 'y')).toBe(false)
    })

    it('marks nothing without a highlight, or for an unknown period', () => {
        expect(isMarkedBy(undefined, { dimension: 'pe', id: '202511' })).toBe(
            false
        )
        expect(
            isMarkedBy({ pe: ['1999'] }, { dimension: 'pe', id: '2025' })
        ).toBe(false)
        expect(
            isMarkedBy({ pe: ['202511'] }, { dimension: 'pe', id: 'nope' })
        ).toBe(false)
    })
})
