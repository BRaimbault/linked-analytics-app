import {
    getPeriodType,
    parsePeriod,
    toPeriodType,
} from '@modules/interactions/periods'
import { describe, expect, it } from 'vitest'

describe('link periods', () => {
    it('reads monthly, quarterly and yearly ids, and nothing else', () => {
        expect(parsePeriod('202602')?.type).toBe('MONTHLY')
        expect(parsePeriod('2026Q3')?.type).toBe('QUARTERLY')
        expect(parsePeriod('2026')?.type).toBe('YEARLY')
        expect(parsePeriod('2026W4')).toBeNull()
        expect(parsePeriod('LAST_MONTH')).toBeNull()
    })

    it('tells the type of fixed and relative periods', () => {
        expect(getPeriodType('202602')).toBe('MONTHLY')
        expect(getPeriodType('LAST_12_MONTHS')).toBe('MONTHLY')
        expect(getPeriodType('MONTHS_THIS_YEAR')).toBe('MONTHLY')
        expect(getPeriodType('QUARTERS_THIS_YEAR')).toBe('QUARTERLY')
        expect(getPeriodType('LAST_4_QUARTERS')).toBe('QUARTERLY')
        expect(getPeriodType('THIS_YEAR')).toBe('YEARLY')
        expect(getPeriodType('LAST_52_WEEKS')).toBeNull()
    })

    it('splits a period into the shorter ones within it', () => {
        expect(toPeriodType('2025', 'QUARTERLY')).toEqual([
            '2025Q1',
            '2025Q2',
            '2025Q3',
            '2025Q4',
        ])
        expect(toPeriodType('2025Q4', 'MONTHLY')).toEqual([
            '202510',
            '202511',
            '202512',
        ])
        expect(toPeriodType('2025', 'MONTHLY')).toHaveLength(12)
        expect(toPeriodType('202503', 'MONTHLY')).toEqual(['202503'])
    })

    it('takes the longer period that contains a shorter one', () => {
        expect(toPeriodType('202511', 'QUARTERLY')).toEqual(['2025Q4'])
        expect(toPeriodType('202511', 'YEARLY')).toEqual(['2025'])
        expect(toPeriodType('2025Q2', 'YEARLY')).toEqual(['2025'])
    })

    it('keeps a period it can’t convert as it is', () => {
        expect(toPeriodType('2026W4', 'MONTHLY')).toEqual(['2026W4'])
    })
})
