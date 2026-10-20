import {
    collectionTypeOf,
    getDataItem,
    type DemoDataElement,
    type DemoDataItem,
} from './data-items'
import { getLeafIds, getOrgUnit, type DemoOrgUnit } from './org-units'
import { getPeriod, type PeriodType } from './periods'
import { districtOf } from './values'

/* Why a view has no data, or less than it seems, for the periods it asks:
 * a value is never split into periods shorter than it was collected in,
 * unless it's averaged over time, which repeats it. Worked out from the
 * demo's metadata, as the proposed @dhis2/analytics feature would for a
 * real server (docs/interactions.md, Periods). */

export type PeriodNotice = {
    dataItem: string
    collectedIn: PeriodType
    askedIn: PeriodType
    /* The districts where it's collected so; none means everywhere asked */
    places: string[]
}

const TYPE_DAYS: Record<PeriodType, number> = {
    WEEKLY: 7,
    MONTHLY: 30,
    QUARTERLY: 91,
    YEARLY: 365,
}

/* The data elements whose collection limits an item's periods */
const limitingElements = (item: DemoDataItem): DemoDataElement[] => {
    const elements =
        item.dimensionItemType === 'INDICATOR'
            ? [item.numeratorId, item.denominatorId].map(
                  (id) => getDataItem(id) as DemoDataElement
              )
            : [item]
    return elements.filter(
        ({ aggregationType }) => aggregationType !== 'AVERAGE_SUM_ORG_UNIT'
    )
}

export const checkPeriods = (
    dataItemIds: string[],
    orgUnitIds: string[],
    periodIds: string[]
): PeriodNotice[] => {
    const askedTypes = periodIds.flatMap(
        (id) => getPeriod(id)?.periodType ?? []
    )
    const chiefdomIds = [
        ...new Set(
            orgUnitIds.filter((id) => getOrgUnit(id)).flatMap(getLeafIds)
        ),
    ]
    if (!askedTypes.length || !chiefdomIds.length) {
        return []
    }
    const askedIn = askedTypes.reduce((shortest, type) =>
        TYPE_DAYS[type] < TYPE_DAYS[shortest] ? type : shortest
    )
    return [...new Set(dataItemIds)].flatMap((id) => {
        const item = getDataItem(id)
        if (!item) {
            return []
        }
        return limitingElements(item).flatMap((element): PeriodNotice[] => {
            const tooLong = chiefdomIds.filter((chiefdomId) => {
                const type = collectionTypeOf(
                    element,
                    districtOf.get(chiefdomId) as string
                )
                return TYPE_DAYS[type] > TYPE_DAYS[askedIn]
            })
            if (!tooLong.length) {
                return []
            }
            const districts = [
                ...new Set(tooLong.map((id) => districtOf.get(id) as string)),
            ]
            return [
                {
                    dataItem: item.name,
                    collectedIn: collectionTypeOf(element, districts[0]),
                    askedIn,
                    places:
                        tooLong.length === chiefdomIds.length
                            ? []
                            : districts.map(
                                  (districtId) =>
                                      (getOrgUnit(districtId) as DemoOrgUnit)
                                          .name
                              ),
                },
            ]
        })
    })
}
