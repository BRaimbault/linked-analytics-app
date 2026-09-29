import { DATA_ITEM_IDS, getDataItem } from './data-items'
import { getLeafIds, getOrgUnit, ORG_UNITS } from './org-units'
import { getPeriod, MONTH_IDS } from './periods'

/* The demo's values: a seeded formula for each chiefdom and month, and
 * sums of those for districts, the country, quarters and years, so
 * drilling always gives consistent numbers. A coverage is worked out from
 * its summed parts, not averaged. */

/* A number in [0, 1) that is always the same for the same text (FNV-1a),
 * the formula's only source of noise */
export const seededRandom = (text: string): number => {
    let hash = 0x811c9dc5
    for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index)
        hash = Math.imul(hash, 0x01000193)
    }
    return (hash >>> 0) / 0x100000000
}

/* Districts differ: malaria weighs most in the south and east, antenatal
 * care and vaccination go best in the north */
const DISTRICT_FACTORS: Record<string, Record<string, number>> = {
    DemoNorth01: { anc: 1.15, penta: 1.1, malaria: 0.6 },
    DemoWest001: { anc: 1, penta: 0.95, malaria: 0.9 },
    DemoEast001: { anc: 0.9, penta: 0.8, malaria: 1.3 },
    DemoSouth01: { anc: 0.85, penta: 0.7, malaria: 1.5 },
}

/* How many people a chiefdom holds, relative to the others */
const sizeOf = (chiefdomId: string) => 0.6 + seededRandom(chiefdomId) * 0.8

/* The season's effect in a month, 1 on average over the year: malaria
 * peaks with the rains in August, antenatal care varies a little */
const season = (monthId: string, strength: number) => {
    const month = Number(monthId.slice(4))
    return 1 + strength * Math.cos(((month - 8) / 12) * 2 * Math.PI)
}

/* A slow rise over the demo's two years */
const trend = (monthId: string) => 1 + MONTH_IDS.indexOf(monthId) * 0.008

const noise = (...parts: string[]) => 0.85 + seededRandom(parts.join(':')) * 0.3

type Parts = { value: number; denominator?: number }

/* Every leaf is a chiefdom, in a district */
const districtOf = new Map(
    ORG_UNITS.filter(({ level }) => level === 3).map(({ id, parentId }) => [
        id,
        parentId as string,
    ])
)

const districtFactor = (chiefdomId: string, topic: string) =>
    DISTRICT_FACTORS[districtOf.get(chiefdomId) as string][topic]

/* One chiefdom, one month */
const leafParts = (
    dataItemId: string,
    chiefdomId: string,
    monthId: string
): Parts => {
    const size = sizeOf(chiefdomId)
    const random = noise(dataItemId, chiefdomId, monthId)
    const anc1 =
        120 *
        size *
        districtFactor(chiefdomId, 'anc') *
        season(monthId, 0.1) *
        trend(monthId)
    switch (dataItemId) {
        case DATA_ITEM_IDS.anc1:
            return { value: Math.round(anc1 * random) }
        case DATA_ITEM_IDS.anc4:
            /* Fewer women come back for a 4th visit */
            return { value: Math.round(anc1 * 0.55 * random) }
        case DATA_ITEM_IDS.malaria:
            return {
                value: Math.round(
                    300 *
                        size *
                        districtFactor(chiefdomId, 'malaria') *
                        season(monthId, 0.6) *
                        random
                ),
            }
        default: {
            /* Penta 3: doses given against the month's target population */
            const target = Math.round(100 * size)
            const rate =
                0.7 *
                districtFactor(chiefdomId, 'penta') *
                trend(monthId) *
                random
            return { value: Math.round(target * rate), denominator: target }
        }
    }
}

/* The value of a data item over several org units and periods together,
 * as analytics aggregates a filter's items: each chiefdom and month counts
 * once. Null when the demo has none: an unknown data item, or no known org
 * unit or period among them. */
export const getTotal = (
    dataItemId: string,
    orgUnitIds: string[],
    periodIds: string[]
): number | null => {
    const dataItem = getDataItem(dataItemId)
    const leafIds = new Set(
        orgUnitIds.filter((id) => getOrgUnit(id)).flatMap(getLeafIds)
    )
    const monthIds = new Set(
        periodIds.flatMap((id) => getPeriod(id)?.monthIds ?? [])
    )
    if (!dataItem || !leafIds.size || !monthIds.size) {
        return null
    }
    let value = 0
    let denominator = 0
    for (const chiefdomId of leafIds) {
        for (const monthId of monthIds) {
            const parts = leafParts(dataItemId, chiefdomId, monthId)
            value += parts.value
            denominator += parts.denominator ?? 0
        }
    }
    return dataItem.valueType === 'PERCENTAGE'
        ? Math.round((1000 * value) / denominator) / 10
        : value
}

/* The value of a data item for one org unit and one period */
export const getValue = (
    dataItemId: string,
    orgUnitId: string,
    periodId: string
): number | null => getTotal(dataItemId, [orgUnitId], [periodId])
