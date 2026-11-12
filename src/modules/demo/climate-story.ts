import { getTotal } from './aggregation'
import { dateOf } from './calendar'
import { DATA_ITEM_IDS } from './data-items'
import { getChildren, ROOT_ORG_UNIT_ID } from './org-units'
import { resolvePeriods, type DemoPeriod } from './periods'

/* The facts the climate tour states, worked out from the demo's data over
 * the last 12 months, so the tour stays true if the data changes */

export type DemoClimateStory = {
    /* The district with the most rain, and how much */
    wettest: { id: string; name: string; yearly: number }
    /* Its wettest month, and how much rain it brought */
    peak: { name: string; value: number }
    /* The share of its year's rain the rainy season, May to October, brings */
    rainySeasonShare: number
    /* Whether its coolest month falls in the rains, and its hottest at the
     * end of the dry season, February to April */
    coolestInRains: boolean
    hottestBeforeRains: boolean
}

const RAINY_MONTHS = new Set([5, 6, 7, 8, 9, 10])
const LATE_DRY_MONTHS = new Set([2, 3, 4])

const monthOf = (period: DemoPeriod) => dateOf(period.start).month

const extreme = (
    values: { period: DemoPeriod; value: number }[],
    sign: 1 | -1
) =>
    values.reduce((best, entry) =>
        sign * entry.value > sign * best.value ? entry : best
    )

export const getClimateStory = (): DemoClimateStory => {
    const months = resolvePeriods(['LAST_12_MONTHS'])
    const valueOf = (dataItemId: string, orgUnitId: string, ids: string[]) =>
        getTotal(dataItemId, [orgUnitId], ids) as number
    const yearly = (orgUnitId: string) =>
        valueOf(
            DATA_ITEM_IDS.precipitation,
            orgUnitId,
            months.map(({ id }) => id)
        )

    const [wettest] = [...getChildren(ROOT_ORG_UNIT_ID)].sort(
        (a, b) => yearly(b.id) - yearly(a.id)
    )
    const byMonth = (dataItemId: string) =>
        months.map((period) => ({
            period,
            value: valueOf(dataItemId, wettest.id, [period.id]),
        }))
    const rain = byMonth(DATA_ITEM_IDS.precipitation)
    const temperature = byMonth(DATA_ITEM_IDS.temperature)
    const peak = extreme(rain, 1)
    const rainySeason = rain
        .filter(({ period }) => RAINY_MONTHS.has(monthOf(period)))
        .reduce((sum, { value }) => sum + value, 0)

    return {
        wettest: {
            id: wettest.id,
            name: wettest.name,
            yearly: yearly(wettest.id),
        },
        peak: { name: peak.period.name, value: peak.value },
        rainySeasonShare: rainySeason / yearly(wettest.id),
        coolestInRains: RAINY_MONTHS.has(
            monthOf(extreme(temperature, -1).period)
        ),
        hottestBeforeRains: LATE_DRY_MONTHS.has(
            monthOf(extreme(temperature, 1).period)
        ),
    }
}
