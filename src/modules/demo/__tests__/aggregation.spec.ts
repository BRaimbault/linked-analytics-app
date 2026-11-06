import { getTotal, getValue } from '@modules/demo/aggregation'
import { DATA_ITEM_IDS } from '@modules/demo/data-items'
import {
    getChildren,
    getLeafIds,
    ROOT_ORG_UNIT_ID,
} from '@modules/demo/org-units'
import {
    getPeriod,
    PERIODS_BY_TYPE,
    type DemoPeriod,
} from '@modules/demo/periods'
import { getLeafValue } from '@modules/demo/values'
import { describe, expect, it } from 'vitest'

const { anc1, anc4, malaria, actStock, penta3, penta3Doses, populationUnder1 } =
    DATA_ITEM_IDS
const COUNTRY = ROOT_ORG_UNIT_ID
const period = (id: string) => getPeriod(id) as DemoPeriod

const sum = (values: (number | null)[]) =>
    values.reduce<number>((total, value) => total + (value ?? 0), 0)

/* The weeks whose Thursday is in a month: those that count in it */
const weeksOf = (monthId: string) =>
    PERIODS_BY_TYPE.WEEKLY.filter(({ start }) => {
        const { start: first, end } = period(monthId)
        return start + 3 >= first && start + 3 <= end
    }).map(({ id }) => id)

describe('demo aggregation', () => {
    it('adds counts up from chiefdoms to districts and the country', () => {
        for (const dataItemId of [anc1, anc4, malaria, actStock]) {
            const districts = getChildren(COUNTRY)
            for (const district of districts) {
                expect(getValue(dataItemId, district.id, '2025')).toBe(
                    sum(
                        getChildren(district.id).map(({ id }) =>
                            getValue(dataItemId, id, '2025')
                        )
                    )
                )
            }
            expect(getValue(dataItemId, COUNTRY, '2025')).toBe(
                sum(districts.map(({ id }) => getValue(dataItemId, id, '2025')))
            )
        }
    })

    it('adds a sum up from months to quarters and years', () => {
        for (const periodId of ['2025Q2', '2025']) {
            const months = PERIODS_BY_TYPE.MONTHLY.filter(
                ({ start }) =>
                    start >= period(periodId).start &&
                    start <= period(periodId).end
            )
            expect(getValue(anc1, 'DemoEast001', periodId)).toBe(
                sum(months.map(({ id }) => getValue(anc1, 'DemoEast001', id)))
            )
        }
    })

    it('counts a week in the month holding most of its days', () => {
        /* Week 1 of 2025 starts on 30 December 2024 */
        expect(weeksOf('202501')).toEqual([
            '2025W1',
            '2025W2',
            '2025W3',
            '2025W4',
            '2025W5',
        ])
        expect(getValue(malaria, 'DemoNorth01', '202501')).toBe(
            sum(
                weeksOf('202501').map((id) =>
                    getValue(malaria, 'DemoNorth01', id)
                )
            )
        )
        expect(getValue(malaria, 'DemoNorth01', '202412')).not.toBe(
            sum(
                ['2024W49', '2024W50', '2024W51', '2024W52', '2025W1'].map(
                    (id) => getValue(malaria, 'DemoNorth01', id)
                )
            )
        )
    })

    it('never splits a value into shorter periods than it was collected in', () => {
        expect(getValue(anc1, COUNTRY, '2025W5')).toBeNull()
        expect(getValue(actStock, COUNTRY, '2025W5')).toBeNull()
        /* Collected monthly in the east: no weeks there */
        expect(getValue(malaria, 'DemoEast001', '2025W5')).toBeNull()
        /* So weekly country totals leave the east and south out */
        expect(getValue(malaria, COUNTRY, '2025W5')).toBe(
            sum(
                ['DemoNorth01', 'DemoWest001'].map((id) =>
                    getValue(malaria, id, '2025W5')
                )
            )
        )
        /* A month holds both the weekly and the monthly reports */
        expect(getValue(malaria, COUNTRY, '202501')).toBe(
            sum(
                getChildren(COUNTRY).map(({ id }) =>
                    getValue(malaria, id, '202501')
                )
            )
        )
    })

    it('repeats a value averaged over time into shorter periods', () => {
        const year = getValue(populationUnder1, COUNTRY, '2025')

        for (const periodId of ['2025Q2', '202503', '2025W10']) {
            expect(getValue(populationUnder1, COUNTRY, periodId)).toBe(year)
        }
        /* Two years together average them, weighed by their days */
        const both = getTotal(populationUnder1, [COUNTRY], ['2025', '2026'])
        const [y2025, y2026] = ['2025', '2026'].map(
            (id) => getValue(populationUnder1, COUNTRY, id) as number
        )
        expect(both).toBeCloseTo((y2025 + y2026) / 2, 0)
    })

    it('takes the last value of a stock, not a sum', () => {
        const lastMonth = sum(
            getLeafIds(COUNTRY).map((id) =>
                getLeafValue(actStock, id, period('202503'))
            )
        )

        expect(getValue(actStock, COUNTRY, '2025Q1')).toBe(lastMonth)
        expect(getValue(actStock, COUNTRY, '2025Q1')).toBe(
            getValue(actStock, COUNTRY, '202503')
        )
    })

    it('works a coverage out from its parts, scaled to a year', () => {
        const coverage = (periodId: string) =>
            getValue(penta3, COUNTRY, periodId) as number
        const doses = getValue(penta3Doses, COUNTRY, '202502') as number
        const population = getValue(
            populationUnder1,
            COUNTRY,
            '202502'
        ) as number

        /* February's doses over the year's population, times 365 / 28 */
        expect(coverage('202502')).toBeCloseTo(
            ((doses * 100) / population) * (365 / 28),
            0
        )
        /* Annualized, a month and the year compare */
        expect(Math.abs(coverage('202502') - coverage('2025'))).toBeLessThan(15)
        const north = getValue(penta3, 'DemoNorth01', '2025') as number
        const south = getValue(penta3, 'DemoSouth01', '2025') as number
        expect(north).toBeGreaterThan(south)
        for (const value of [north, south]) {
            expect(value).toBeGreaterThan(30)
            expect(value).toBeLessThan(110)
        }
        /* One decimal, as DHIS2 shows a percentage */
        expect(Math.round(coverage('2025') * 10) / 10).toBe(coverage('2025'))
        expect(getValue(penta3, COUNTRY, '2025W5')).toBeNull()
    })

    it('has no value for an unknown data item, org unit or period', () => {
        expect(getValue('nope', COUNTRY, '2025')).toBeNull()
        expect(getValue(anc1, 'nope', '2025')).toBeNull()
        expect(getValue(anc1, COUNTRY, '2023')).toBeNull()
        expect(getValue(populationUnder1, COUNTRY, '2023')).toBeNull()
    })
})
