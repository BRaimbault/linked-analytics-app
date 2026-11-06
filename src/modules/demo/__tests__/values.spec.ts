import { DATA_ITEM_IDS } from '@modules/demo/data-items'
import { getPeriod, type DemoPeriod } from '@modules/demo/periods'
import { getLeafValue, seededRandom } from '@modules/demo/values'
import { describe, expect, it } from 'vitest'

const { anc1, anc4, malaria, actStock, populationUnder1 } = DATA_ITEM_IDS
const period = (id: string) => getPeriod(id) as DemoPeriod
const KESTREL = 'DemoChW0101'
const JUNIPER = 'DemoChS0103'

describe('demo values', () => {
    it('draws noise that is always the same for the same text, and differs at the end', () => {
        expect(seededRandom('a')).toBe(seededRandom('a'))
        expect(seededRandom('a')).not.toBe(seededRandom('b'))
        expect(seededRandom('a')).toBeGreaterThanOrEqual(0)
        expect(seededRandom('a')).toBeLessThan(1)
        /* Ids that differ only in their last character, as weeks do */
        const weeks = ['1', '2', '3', '4', '5'].map((week) =>
            seededRandom(`DemoMalar01:DemoChN0101:2025W${week}`)
        )
        expect(new Set(weeks.map((value) => value.toFixed(2))).size).toBe(5)
    })

    it('stores a value per chiefdom and period, in proportion to the period', () => {
        const month = getLeafValue(malaria, KESTREL, period('202508'))
        const week = getLeafValue(malaria, KESTREL, period('2025W33'))

        /* A week holds about a quarter of a month's cases */
        expect(week).toBeGreaterThan(month / 7)
        expect(week).toBeLessThan(month / 2.5)
        expect(Number.isInteger(week)).toBe(true)
    })

    it('keeps values plausible', () => {
        /* Fewer women come back for a 4th visit */
        expect(getLeafValue(anc4, KESTREL, period('202503'))).toBeLessThan(
            getLeafValue(anc1, KESTREL, period('202503'))
        )
        /* Malaria rises with the rains, by a fifth rather than a multiple,
         * and the stock runs lowest just after */
        const june = getLeafValue(malaria, KESTREL, period('202506'))
        const february = getLeafValue(malaria, KESTREL, period('202502'))
        expect(june).toBeGreaterThan(february)
        expect(june).toBeLessThan(2 * february)
        expect(getLeafValue(actStock, KESTREL, period('202507'))).toBeLessThan(
            getLeafValue(actStock, KESTREL, period('202502'))
        )
        /* In the south, July's stock covers less than a month of cases */
        expect(getLeafValue(actStock, JUNIPER, period('202507'))).toBeLessThan(
            getLeafValue(malaria, JUNIPER, period('202507'))
        )
        /* The population grows a little from one year to the next */
        expect(
            getLeafValue(populationUnder1, KESTREL, period('2026'))
        ).toBeGreaterThan(
            getLeafValue(populationUnder1, KESTREL, period('2025'))
        )
    })
})
