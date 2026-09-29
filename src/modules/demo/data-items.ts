/* The demo's data items: three counts and a coverage indicator, which has
 * a legend set. Names follow the dev server's demo database, so the demo
 * reads like the real one; the numbers are made up. */

export type DemoDataItem = {
    id: string
    name: string
    dimensionItemType: 'DATA_ELEMENT' | 'INDICATOR'
    /* A count adds up; a percentage is worked out from its parts */
    valueType: 'COUNT' | 'PERCENTAGE'
    legendSetId?: string
}

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
    malaria: 'DemoMalar01',
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
        valueType: 'COUNT',
    },
    {
        id: DATA_ITEM_IDS.anc4,
        name: 'ANC 4th or more visits',
        dimensionItemType: 'DATA_ELEMENT',
        valueType: 'COUNT',
    },
    {
        id: DATA_ITEM_IDS.penta3,
        name: 'Penta 3 coverage <1y',
        dimensionItemType: 'INDICATOR',
        valueType: 'PERCENTAGE',
        legendSetId: 'DemoLegCov1',
    },
    {
        id: DATA_ITEM_IDS.malaria,
        name: 'Malaria cases confirmed',
        dimensionItemType: 'DATA_ELEMENT',
        valueType: 'COUNT',
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
