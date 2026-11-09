import {
    getDimensionItemIds,
    type MapView,
} from '@modules/visualization/analytical-object'
import { getTotal } from './aggregation'
import { DATA_ITEM_IDS } from './data-items'
import { buildDemoMapLayer, type ClassRange } from './map-layer'
import { getChildren, ROOT_ORG_UNIT_ID, type DemoOrgUnit } from './org-units'
import { resolvePeriods, type DemoPeriod } from './periods'
import { DEMO_MAPS } from './saved-items'

/* What the demo's preset shows, worked out from its data, for the tour to
 * tell: malaria weighs most where vaccination reaches fewest children.
 * Periods as the preset's views ask for them. */

/* The coverage every district should reach, as WHO sets it */
export const COVERAGE_TARGET = 80

type Place = { id: string; name: string }

export type DemoStory = {
    country: { incidence: number }
    /* The districts with the highest and lowest malaria incidence */
    highest: Place & { incidence: number }
    lowest: Place & { incidence: number }
    /* Whether the highest stays highest in every month shown */
    highestEveryMonth: boolean
    coverageQuarter: string
    /* Chiefdoms under the coverage target for Penta 3 in that quarter */
    belowTarget: { count: number; of: number; districts: string[] }
    /* The highest district's chiefdoms, and how many are under the target
     * for both vaccines */
    highestChiefdoms: { count: number; belowTarget: number }
    /* Whether the highest district has the lowest malaria vaccine coverage
     * in that quarter: where the burden is highest, coverage is lowest */
    highestHasLowestCoverage: boolean
    /* Whether the malaria vaccine, given at the same visits, reaches fewer
     * children than Penta 3 in every district */
    malariaVaccineLowerEverywhere: boolean
    /* Whether every chiefdom of the highest district is above the
     * country's rate for the year in each month the chart shows: no single
     * hotspot */
    highestChiefdomsAboveCountry: boolean
    /* Whether the incidence map, drilled down into the highest district,
     * draws every chiefdom in its top class, as for the district: its
     * classes stay the districts' (the legend lock) */
    highestChiefdomsInTopClass: boolean
}

const isEveryChiefdomInTopClass = (districtId: string): boolean => {
    const view = DEMO_MAPS.flatMap(({ mapViews }) => mapViews).find(
        (candidate) =>
            getDimensionItemIds(candidate, 'dx')[0] ===
            DATA_ITEM_IDS.malariaIncidence
    ) as MapView
    const districts = buildDemoMapLayer(view)
    const drilled = buildDemoMapLayer(
        {
            ...view,
            rows: [
                {
                    dimension: 'ou',
                    items: [{ id: districtId }, { id: 'LEVEL-3' }],
                },
            ],
        },
        districts.dataRange as ClassRange
    )
    const [top] = districts.legend
    return drilled.features.every(({ color }) => color === top.color)
}

const valueOf = (dataItemId: string, orgUnitId: string, periodIds: string[]) =>
    getTotal(dataItemId, [orgUnitId], periodIds) as number

const place = ({ id, name }: DemoOrgUnit): Place => ({ id, name })

export const getDemoStory = (): DemoStory => {
    const months = resolvePeriods(['LAST_12_MONTHS']).map(({ id }) => id)
    const [quarter] = resolvePeriods(['LAST_QUARTER']) as [DemoPeriod]
    const quarterIds = [quarter.id]
    const coverage = (dataItemId: string, orgUnitId: string) =>
        valueOf(dataItemId, orgUnitId, quarterIds)
    const incidence = (orgUnitId: string, periodIds = months) =>
        valueOf(DATA_ITEM_IDS.malariaIncidence, orgUnitId, periodIds)

    const districts = [...getChildren(ROOT_ORG_UNIT_ID)].sort(
        (a, b) => incidence(b.id) - incidence(a.id)
    )
    const [highest] = districts
    const lowest = districts[districts.length - 1]

    const isBelowTarget = ({ id }: DemoOrgUnit) =>
        coverage(DATA_ITEM_IDS.penta3, id) < COVERAGE_TARGET
    const isBelowForBoth = (orgUnit: DemoOrgUnit) =>
        isBelowTarget(orgUnit) &&
        coverage(DATA_ITEM_IDS.malariaVaccine3, orgUnit.id) < COVERAGE_TARGET
    const chiefdoms = districts.flatMap(({ id }) => getChildren(id))
    const below = chiefdoms.filter(isBelowTarget)
    const highestChiefdoms = getChildren(highest.id)

    return {
        country: { incidence: incidence(ROOT_ORG_UNIT_ID) },
        highest: { ...place(highest), incidence: incidence(highest.id) },
        lowest: { ...place(lowest), incidence: incidence(lowest.id) },
        highestEveryMonth: months.every((month) =>
            districts.every(
                ({ id }) =>
                    incidence(id, [month]) <= incidence(highest.id, [month])
            )
        ),
        coverageQuarter: quarter.name,
        belowTarget: {
            count: below.length,
            of: chiefdoms.length,
            districts: districts
                .filter(({ id }) =>
                    below.some(({ parentId }) => parentId === id)
                )
                .map(({ name }) => name),
        },
        highestChiefdoms: {
            count: highestChiefdoms.length,
            belowTarget: highestChiefdoms.filter(isBelowForBoth).length,
        },
        highestHasLowestCoverage: districts.every(
            ({ id }) =>
                coverage(DATA_ITEM_IDS.malariaVaccine3, id) >=
                coverage(DATA_ITEM_IDS.malariaVaccine3, highest.id)
        ),
        highestChiefdomsAboveCountry: months.every((month) =>
            highestChiefdoms.every(
                ({ id }) => incidence(id, [month]) > incidence(ROOT_ORG_UNIT_ID)
            )
        ),
        highestChiefdomsInTopClass: isEveryChiefdomInTopClass(highest.id),
        malariaVaccineLowerEverywhere: districts.every(
            ({ id }) =>
                coverage(DATA_ITEM_IDS.malariaVaccine3, id) <
                coverage(DATA_ITEM_IDS.penta3, id)
        ),
    }
}
