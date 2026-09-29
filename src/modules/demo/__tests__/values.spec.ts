import { DATA_ITEM_IDS } from '@modules/demo/data-items'
import { getChildren, ROOT_ORG_UNIT_ID } from '@modules/demo/org-units'
import { getPeriod } from '@modules/demo/periods'
import { getValue, seededRandom } from '@modules/demo/values'
import { describe, expect, it } from 'vitest'

const { anc1, anc4, penta3, malaria } = DATA_ITEM_IDS
const COUNTS = [anc1, anc4, malaria]

const sum = (values: (number | null)[]) =>
    values.reduce<number>((total, value) => total + (value ?? 0), 0)

describe('demo values', () => {
    it('draws noise that is always the same for the same text', () => {
        expect(seededRandom('a')).toBe(seededRandom('a'))
        expect(seededRandom('a')).not.toBe(seededRandom('b'))
        expect(seededRandom('a')).toBeGreaterThanOrEqual(0)
        expect(seededRandom('a')).toBeLessThan(1)
    })

    it('adds counts up from chiefdoms to districts and the country', () => {
        for (const dataItemId of COUNTS) {
            const districts = getChildren(ROOT_ORG_UNIT_ID)
            for (const district of districts) {
                expect(getValue(dataItemId, district.id, '2025')).toBe(
                    sum(
                        getChildren(district.id).map(({ id }) =>
                            getValue(dataItemId, id, '2025')
                        )
                    )
                )
            }
            expect(getValue(dataItemId, ROOT_ORG_UNIT_ID, '2025')).toBe(
                sum(districts.map(({ id }) => getValue(dataItemId, id, '2025')))
            )
        }
    })

    it('adds counts up from months to quarters and years', () => {
        for (const periodId of ['2025Q2', '2025', '2026']) {
            const months = getPeriod(periodId)?.monthIds ?? []
            expect(getValue(anc1, 'DemoEast001', periodId)).toBe(
                sum(months.map((month) => getValue(anc1, 'DemoEast001', month)))
            )
        }
    })

    it('works a coverage out from its parts, not as an average', () => {
        const coverage = getValue(penta3, ROOT_ORG_UNIT_ID, '2025') as number
        const districts = getChildren(ROOT_ORG_UNIT_ID).map(
            ({ id }) => getValue(penta3, id, '2025') as number
        )

        expect(coverage).toBeGreaterThan(Math.min(...districts))
        expect(coverage).toBeLessThan(Math.max(...districts))
        /* One decimal, as DHIS2 shows a percentage */
        expect(Math.round(coverage * 10) / 10).toBe(coverage)
    })

    it('keeps values plausible, and different between places', () => {
        const north = getValue(penta3, 'DemoNorth01', '2025') as number
        const south = getValue(penta3, 'DemoSouth01', '2025') as number

        expect(north).toBeGreaterThan(south)
        for (const value of [north, south]) {
            expect(value).toBeGreaterThan(30)
            expect(value).toBeLessThan(110)
        }
        /* Fewer women come back for a 4th visit */
        expect(getValue(anc4, 'DemoWest001', '2025')).toBeLessThan(
            getValue(anc1, 'DemoWest001', '2025') as number
        )
    })

    it('peaks malaria with the rains, in August', () => {
        expect(getValue(malaria, ROOT_ORG_UNIT_ID, '202508')).toBeGreaterThan(
            2 * (getValue(malaria, ROOT_ORG_UNIT_ID, '202502') as number)
        )
    })

    it('has no value for an unknown data item, org unit or period', () => {
        expect(getValue('nope', ROOT_ORG_UNIT_ID, '2025')).toBeNull()
        expect(getValue(anc1, 'nope', '2025')).toBeNull()
        expect(getValue(anc1, ROOT_ORG_UNIT_ID, '2023')).toBeNull()
    })
})
