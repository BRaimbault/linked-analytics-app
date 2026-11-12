import { getAreaMean } from './climate'
import {
    collectionTypeOf,
    getDataItem,
    isClimateElement,
    type ClimateAggregationType,
    type DemoClimateElement,
    type DemoDataElement,
    type DemoIndicator,
} from './data-items'
import { getLeafIds, getOrgUnit, type DemoOrgUnit } from './org-units'
import {
    getPeriod,
    lengthOf,
    PERIODS_BY_TYPE,
    type DemoPeriod,
    type PeriodType,
} from './periods'
import { districtOf, getLeafValue } from './values'

/* Data values added up over places and time as DHIS2 analytics does it,
 * which tests on 2.43 and 2.44 servers showed:
 * - a period takes the stored values whose period has its middle day in
 *   it, and is no longer than it: a week counts in the month holding most
 *   of its days, and a monthly value is never split into weeks;
 * - a sum adds them up; a last value takes the latest;
 * - an average over time (AVERAGE_SUM_ORG_UNIT) weighs each stored value
 *   by the days it shares with the periods asked, so a yearly value
 *   repeats into every shorter period;
 * - places add up in every case, except climate data, stored at every
 *   level (see climateTotal);
 * - an indicator divides its numerator's total by its denominator's, and
 *   scales the result to a year (the demo's are annualized). */

const middleOf = ({ start, end }: DemoPeriod) => Math.floor((start + end) / 2)

const overlapOf = (a: DemoPeriod, b: DemoPeriod) =>
    Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start) + 1)

/* The stored periods of a type that count in the periods asked */
const countedPeriods = (type: PeriodType, periods: DemoPeriod[]) =>
    PERIODS_BY_TYPE[type].filter((stored) =>
        periods.some(
            (period) =>
                lengthOf(stored) <= lengthOf(period) &&
                middleOf(stored) >= period.start &&
                middleOf(stored) <= period.end
        )
    )

const chiefdomTotal = (
    element: DemoDataElement,
    chiefdomId: string,
    periods: DemoPeriod[]
): number | null => {
    const type = collectionTypeOf(element, districtOf.get(chiefdomId) as string)
    const valueOf = (stored: DemoPeriod) =>
        getLeafValue(element.id, chiefdomId, stored)
    /* Only yearly values are averaged, and the demo's years cover every
     * period it knows, so some days are always shared */
    if (element.aggregationType === 'AVERAGE_SUM_ORG_UNIT') {
        let weighted = 0
        let days = 0
        for (const stored of PERIODS_BY_TYPE[type]) {
            for (const period of periods) {
                const shared = overlapOf(stored, period)
                weighted += valueOf(stored) * shared
                days += shared
            }
        }
        return weighted / days
    }
    const counted = countedPeriods(type, periods)
    if (!counted.length) {
        return null
    }
    return element.aggregationType === 'LAST'
        ? valueOf(counted[counted.length - 1])
        : counted.reduce((sum, stored) => sum + valueOf(stored), 0)
}

const elementTotal = (
    element: DemoDataElement,
    chiefdomIds: string[],
    periods: DemoPeriod[]
): number | null => {
    const totals = chiefdomIds
        .map((id) => chiefdomTotal(element, id, periods))
        .filter((total): total is number => total !== null)
    return totals.length
        ? Math.round(totals.reduce((sum, total) => sum + total, 0) * 100) / 100
        : null
}

const COMBINE: Record<ClimateAggregationType, (values: number[]) => number> = {
    SUM: (values) => values.reduce((sum, value) => sum + value, 0),
    AVERAGE: (values) =>
        values.reduce((sum, value) => sum + value, 0) / values.length,
    MAX: (values) => Math.max(...values),
    MIN: (values) => Math.min(...values),
}

/* Climate data is stored at every level: each org unit reads its own
 * values, its area's mean, not its chiefdoms' total. The aggregation type
 * combines the months counted, then the org units asked together. */
const climateTotal = (
    element: DemoClimateElement,
    orgUnits: DemoOrgUnit[],
    periods: DemoPeriod[]
): number | null => {
    const months = countedPeriods(element.collectedIn, periods)
    if (!months.length) {
        return null
    }
    const combine = COMBINE[element.aggregationType]
    const { band } = element.importedFrom
    const total = combine(
        orgUnits.map((orgUnit) =>
            combine(months.map((month) => getAreaMean(band, orgUnit, month)))
        )
    )
    return Math.round(total * 10) / 10
}

const DAYS_PER_YEAR = 365

const indicatorTotal = (
    indicator: DemoIndicator,
    chiefdomIds: string[],
    periods: DemoPeriod[]
): number | null => {
    const partOf = (id: string) =>
        elementTotal(getDataItem(id) as DemoDataElement, chiefdomIds, periods)
    /* The denominator, a population, is averaged: always there */
    const numerator = partOf(indicator.numeratorId)
    const denominator = partOf(indicator.denominatorId) as number
    if (numerator === null) {
        return null
    }
    const days = periods.reduce((sum, period) => sum + lengthOf(period), 0)
    const toYear = DAYS_PER_YEAR / days
    return (
        Math.round(
            ((numerator * indicator.factor * toYear) / denominator) * 10
        ) / 10
    )
}

/* The value of a data item over several org units and periods together,
 * as analytics aggregates a filter's items. Null when the demo has none:
 * an unknown data item, no known org unit or period among them, or no
 * stored value that counts in those periods. */
export const getTotal = (
    dataItemId: string,
    orgUnitIds: string[],
    periodIds: string[]
): number | null => {
    const dataItem = getDataItem(dataItemId)
    const orgUnits = [
        ...new Set(orgUnitIds.flatMap((id) => getOrgUnit(id) ?? [])),
    ]
    const chiefdomIds = [
        ...new Set(orgUnits.flatMap(({ id }) => getLeafIds(id))),
    ]
    const periods = [
        ...new Map(
            periodIds.flatMap((id) => {
                const period = getPeriod(id)
                return period ? [[id, period] as const] : []
            })
        ).values(),
    ]
    if (!dataItem || !orgUnits.length || !periods.length) {
        return null
    }
    if (dataItem.dimensionItemType === 'INDICATOR') {
        return indicatorTotal(dataItem, chiefdomIds, periods)
    }
    return isClimateElement(dataItem)
        ? climateTotal(dataItem, orgUnits, periods)
        : elementTotal(dataItem, chiefdomIds, periods)
}

/* The value of a data item for one org unit and one period */
export const getValue = (
    dataItemId: string,
    orgUnitId: string,
    periodId: string
): number | null => getTotal(dataItemId, [orgUnitId], [periodId])
