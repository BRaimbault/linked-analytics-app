import { getTotal } from '@modules/demo/aggregation'
import { DATA_ITEM_IDS } from '@modules/demo/data-items'
import { getChildren, ROOT_ORG_UNIT_ID } from '@modules/demo/org-units'
import { resolvePeriods } from '@modules/demo/periods'
import { COVERAGE_TARGET, getDemoStory } from '@modules/demo/story'
import { describe, expect, it } from 'vitest'

/* The tour states these facts in words; if the data changes, they must
 * still hold */
describe('demo story', () => {
    const story = getDemoStory()

    it('has malaria weigh most in the south, several times the north', () => {
        expect(story.highest.name).toBe('South')
        expect(story.lowest.name).toBe('North')
        expect(
            story.highest.incidence / story.lowest.incidence
        ).toBeGreaterThan(3)
        expect(story.highestEveryMonth).toBe(true)
        expect(story.highestChiefdomsAboveCountry).toBe(true)
        /* Drilled down, the map shows the whole district in its top class */
        expect(story.highestChiefdomsInTopClass).toBe(true)
        /* About the national rate where malaria is endemic all year */
        expect(story.country.incidence).toBeGreaterThan(200)
        expect(story.country.incidence).toBeLessThan(450)
    })

    it('has vaccination fall short of the target where malaria weighs most', () => {
        expect(COVERAGE_TARGET).toBe(80)
        expect(story.coverageQuarter).toBe('April - June 2026')
        expect(story.belowTarget.districts).toEqual(['South', 'East'])
        expect(story.belowTarget.count).toBeLessThan(story.belowTarget.of)
        /* Every chiefdom of the highest district is under the target, for
         * both vaccines */
        expect(story.highestChiefdoms.belowTarget).toBe(
            story.highestChiefdoms.count
        )
        expect(story.malariaVaccineLowerEverywhere).toBe(true)
    })

    it('has the malaria vaccine reach fewer children than Penta 3 in every chiefdom', () => {
        const [quarter] = resolvePeriods(['LAST_QUARTER'])
        for (const district of getChildren(ROOT_ORG_UNIT_ID)) {
            for (const { id } of getChildren(district.id)) {
                const coverage = (dataItemId: string) =>
                    getTotal(dataItemId, [id], [quarter.id]) as number
                expect(coverage(DATA_ITEM_IDS.malariaVaccine3)).toBeLessThan(
                    coverage(DATA_ITEM_IDS.penta3)
                )
            }
        }
    })
})
