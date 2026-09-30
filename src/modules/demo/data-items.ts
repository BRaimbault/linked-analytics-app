import type { PeriodType } from './periods'

/* The demo's data items, collected and aggregated as DHIS2 does it, so the
 * demo shows what linking periods runs into: counts collected monthly, or
 * weekly in some districts and monthly in others; a yearly population,
 * which analytics repeats into shorter periods; a stock, whose value for a
 * quarter is its last month's; and a coverage indicator worked out from
 * two of them. Names follow the dev server's demo database, so the demo
 * reads like the real one; the numbers are made up. */

/* The aggregation types the demo uses, as DHIS2 names them */
export type DemoAggregationType = 'SUM' | 'AVERAGE_SUM_ORG_UNIT' | 'LAST'

export type DemoDataElement = {
    id: string
    name: string
    dimensionItemType: 'DATA_ELEMENT'
    aggregationType: DemoAggregationType
    /* Its data set's period type, and where another data set collects it
     * at another type, by district */
    collectedIn: PeriodType
    collectedInByDistrict?: Record<string, PeriodType>
    legendSetId?: string
}

export type DemoIndicator = {
    id: string
    name: string
    dimensionItemType: 'INDICATOR'
    numeratorId: string
    denominatorId: string
    factor: number
    /* Scaled to a year, so a month and a year compare, as DHIS2's
     * coverage indicators are: the demo has no other kind */
    annualized: true
    legendSetId?: string
}

export type DemoDataItem = DemoDataElement | DemoIndicator

export type DemoLegend = {
    startValue: number
    endValue: number
    color: string
    name: string
}

export type DemoLegendSet = { id: string; name: string; legends: DemoLegend[] }

export const DATA_ITEM_IDS = {
    anc1: 'DemoAnc1st1',
    anc4: 'DemoAnc4th1',
    penta3: 'DemoPenta31',
    penta3Doses: 'DemoPentaD1',
    populationUnder1: 'DemoPopU1y1',
    malaria: 'DemoMalar01',
    actStock: 'DemoActStk1',
} as const

export const LEGEND_SETS: DemoLegendSet[] = [
    {
        id: 'DemoLegCov1',
        name: 'Coverage',
        legends: [
            { startValue: 0, endValue: 50, color: '#d7301f', name: 'Low' },
            { startValue: 50, endValue: 80, color: '#fdae61', name: 'Medium' },
            { startValue: 80, endValue: 1000, color: '#1a9850', name: 'High' },
        ],
    },
]

export const DATA_ITEMS: DemoDataItem[] = [
    {
        id: DATA_ITEM_IDS.anc1,
        name: 'ANC 1st visit',
        dimensionItemType: 'DATA_ELEMENT',
        aggregationType: 'SUM',
        collectedIn: 'MONTHLY',
    },
    {
        id: DATA_ITEM_IDS.anc4,
        name: 'ANC 4th or more visits',
        dimensionItemType: 'DATA_ELEMENT',
        aggregationType: 'SUM',
        collectedIn: 'MONTHLY',
    },
    {
        id: DATA_ITEM_IDS.penta3,
        name: 'Penta 3 coverage <1y',
        dimensionItemType: 'INDICATOR',
        numeratorId: DATA_ITEM_IDS.penta3Doses,
        denominatorId: DATA_ITEM_IDS.populationUnder1,
        factor: 100,
        annualized: true,
        legendSetId: 'DemoLegCov1',
    },
    {
        id: DATA_ITEM_IDS.penta3Doses,
        name: 'Penta 3 doses given',
        dimensionItemType: 'DATA_ELEMENT',
        aggregationType: 'SUM',
        collectedIn: 'MONTHLY',
    },
    {
        id: DATA_ITEM_IDS.populationUnder1,
        name: 'Population under 1 year',
        dimensionItemType: 'DATA_ELEMENT',
        aggregationType: 'AVERAGE_SUM_ORG_UNIT',
        collectedIn: 'YEARLY',
    },
    {
        /* Weekly surveillance in the north and west; the monthly report
         * elsewhere */
        id: DATA_ITEM_IDS.malaria,
        name: 'Malaria cases confirmed',
        dimensionItemType: 'DATA_ELEMENT',
        aggregationType: 'SUM',
        collectedIn: 'WEEKLY',
        collectedInByDistrict: {
            DemoEast001: 'MONTHLY',
            DemoSouth01: 'MONTHLY',
        },
    },
    {
        id: DATA_ITEM_IDS.actStock,
        name: 'Antimalarial (ACT) stock on hand',
        dimensionItemType: 'DATA_ELEMENT',
        aggregationType: 'LAST',
        collectedIn: 'MONTHLY',
    },
]

const byId = new Map(DATA_ITEMS.map((item) => [item.id, item]))

export const getDataItem = (id: string): DemoDataItem | undefined =>
    byId.get(id)

/* The data items an analytics request's dx items stand for; unknown ids
 * are dropped */
export const resolveDataItems = (items: string[]): DemoDataItem[] =>
    items.flatMap((id) => byId.get(id) ?? [])

export const getLegendSet = (id: string): DemoLegendSet | undefined =>
    LEGEND_SETS.find((legendSet) => legendSet.id === id)

/* The period type a data element is collected in, in a district */
export const collectionTypeOf = (
    { collectedIn, collectedInByDistrict }: DemoDataElement,
    districtId: string
): PeriodType => collectedInByDistrict?.[districtId] ?? collectedIn
