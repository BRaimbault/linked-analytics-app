import { dayOf, isoDateOf, isoWeekOf } from '@modules/demo/calendar'
import {
    DATA_SPAN,
    getPeriod,
    getPeriodItemName,
    lengthOf,
    PERIODS_BY_TYPE,
    RELATIVE_PERIOD_IDS,
    resolvePeriods,
} from '@modules/demo/periods'
import { describe, expect, it } from 'vitest'

const ids = (items: string[]) => resolvePeriods(items).map(({ id }) => id)
const idsOf = (type: keyof typeof PERIODS_BY_TYPE) =>
    PERIODS_BY_TYPE[type].map(({ id }) => id)

describe('demo calendar', () => {
    it('counts days from 1970, and numbers weeks as ISO 8601 does', () => {
        expect(dayOf(1970, 1, 2)).toBe(1)
        expect(isoDateOf(dayOf(2026, 1, 12))).toBe('2026-01-12')
        /* 30 December 2024 is a Monday in week 1 of 2025; 3 January 2021
         * a Sunday in week 53 of 2020 */
        expect(isoWeekOf(dayOf(2024, 12, 30))).toEqual({ year: 2025, week: 1 })
        expect(isoWeekOf(dayOf(2021, 1, 3))).toEqual({ year: 2020, week: 53 })
    })
})

describe('demo periods', () => {
    it('covers the 24 months up to the demo date, each a range of days', () => {
        const months = idsOf('MONTHLY')

        expect(months).toHaveLength(24)
        expect([months[0], months.at(-1)]).toEqual(['202409', '202608'])
        expect(getPeriod('202602')).toEqual(
            expect.objectContaining({
                name: 'February 2026',
                start: dayOf(2026, 2, 1),
                end: dayOf(2026, 2, 28),
            })
        )
        expect(DATA_SPAN).toEqual({
            start: dayOf(2024, 9, 1),
            end: dayOf(2026, 8, 31),
        })
    })

    it('holds the weeks whose Thursday falls in those months, named as DHIS2 does', () => {
        const weeks = PERIODS_BY_TYPE.WEEKLY

        expect(weeks).toHaveLength(104)
        expect([weeks[0].id, weeks.at(-1)?.id]).toEqual(['2024W36', '2026W35'])
        expect(getPeriod('2025W1')).toEqual(
            expect.objectContaining({
                name: 'Week 1 - 2024-12-30 - 2025-01-05',
                periodType: 'WEEKLY',
            })
        )
        expect(weeks.every((week) => lengthOf(week) === 7)).toBe(true)
    })

    it('takes whole quarters and years for those the months fall in', () => {
        expect(idsOf('QUARTERLY')).toEqual([
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
        expect(idsOf('YEARLY')).toEqual(['2024', '2025', '2026'])
        expect(getPeriod('2024Q4')).toEqual(
            expect.objectContaining({
                name: 'October - December 2024',
                start: dayOf(2024, 10, 1),
                end: dayOf(2024, 12, 31),
            })
        )
        expect(lengthOf(getPeriod('2024') as never)).toBe(366)
    })

    it('resolves relative periods against the demo date', () => {
        expect(ids(['LAST_WEEK'])).toEqual(['2026W35'])
        expect(ids(['LAST_4_WEEKS'])).toEqual([
            '2026W32',
            '2026W33',
            '2026W34',
            '2026W35',
        ])
        expect(ids(['LAST_12_WEEKS'])).toHaveLength(12)
        expect(ids(['LAST_52_WEEKS'])[0]).toBe('2025W36')
        expect(ids(['WEEKS_THIS_YEAR'])).toHaveLength(35)
        expect(ids(['THIS_MONTH'])).toEqual(['202608'])
        expect(ids(['LAST_MONTH'])).toEqual(['202607'])
        expect(ids(['LAST_3_MONTHS'])).toEqual(['202605', '202606', '202607'])
        expect(ids(['LAST_6_MONTHS'])).toHaveLength(6)
        expect(ids(['LAST_12_MONTHS'])).toEqual(idsOf('MONTHLY').slice(11, 23))
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
        expect(RELATIVE_PERIOD_IDS).toHaveLength(17)
    })

    it('names a relative period by its own name, as DHIS2 does', () => {
        expect(getPeriodItemName('LAST_12_WEEKS')).toBe('Last 12 weeks')
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
