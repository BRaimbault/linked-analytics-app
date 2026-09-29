import {
    getPeriod,
    getPeriodItemName,
    MONTH_IDS,
    PERIODS,
    RELATIVE_PERIOD_IDS,
    resolvePeriods,
} from '@modules/demo/periods'
import { describe, expect, it } from 'vitest'

const ids = (items: string[]) => resolvePeriods(items).map(({ id }) => id)

describe('demo periods', () => {
    it('covers the 24 months up to the demo date', () => {
        expect(MONTH_IDS).toHaveLength(24)
        expect(MONTH_IDS[0]).toBe('202409')
        expect(MONTH_IDS.at(-1)).toBe('202608')
        expect(getPeriod('202608')?.name).toBe('August 2026')
    })

    it('groups the months into the quarters and years they fall in', () => {
        const byType = (periodType: string) =>
            PERIODS.filter((period) => period.periodType === periodType).map(
                ({ id }) => id
            )

        expect(byType('QUARTERLY')).toEqual([
            '2024Q3',
            '2024Q4',
            '2025Q1',
            '2025Q2',
            '2025Q3',
            '2025Q4',
            '2026Q1',
            '2026Q2',
            '2026Q3',
        ])
        expect(byType('YEARLY')).toEqual(['2024', '2025', '2026'])
        expect(getPeriod('2026Q3')).toEqual({
            id: '2026Q3',
            name: 'July - September 2026',
            periodType: 'QUARTERLY',
            monthIds: ['202607', '202608'],
        })
        expect(getPeriod('2025')?.monthIds).toHaveLength(12)
    })

    it('resolves relative periods against the demo date', () => {
        expect(ids(['THIS_MONTH'])).toEqual(['202608'])
        expect(ids(['LAST_MONTH'])).toEqual(['202607'])
        expect(ids(['LAST_3_MONTHS'])).toEqual(['202605', '202606', '202607'])
        expect(ids(['LAST_6_MONTHS'])).toHaveLength(6)
        expect(ids(['LAST_12_MONTHS'])).toEqual([...MONTH_IDS.slice(11, 23)])
        expect(ids(['MONTHS_THIS_YEAR'])).toHaveLength(8)
        expect(ids(['THIS_QUARTER'])).toEqual(['2026Q3'])
        expect(ids(['LAST_QUARTER'])).toEqual(['2026Q2'])
        expect(ids(['LAST_4_QUARTERS'])).toEqual([
            '2025Q3',
            '2025Q4',
            '2026Q1',
            '2026Q2',
        ])
        expect(ids(['QUARTERS_THIS_YEAR'])).toEqual([
            '2026Q1',
            '2026Q2',
            '2026Q3',
        ])
        expect(ids(['THIS_YEAR'])).toEqual(['2026'])
        expect(ids(['LAST_YEAR'])).toEqual(['2025'])
        expect(RELATIVE_PERIOD_IDS).toHaveLength(12)
    })

    it('names a relative period by its own name, as DHIS2 does', () => {
        expect(getPeriodItemName('LAST_12_MONTHS')).toBe('Last 12 months')
        expect(getPeriodItemName('2026Q3')).toBe('July - September 2026')
        expect(getPeriodItemName('1999')).toBeUndefined()
    })

    it('keeps fixed periods, in order, and drops unknown ids and repeats', () => {
        expect(ids(['2025', 'nope', 'LAST_MONTH', '202607'])).toEqual([
            '2025',
            '202607',
        ])
    })
})
