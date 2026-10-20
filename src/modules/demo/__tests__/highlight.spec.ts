import { withRelatedOrgUnits } from '@modules/demo/highlight'
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
