import type {
    Dimension,
    MapObject,
    VisualizationObject,
} from '@modules/visualization/analytical-object'
import { DATA_ITEM_IDS, getDataItem } from './data-items'

/* A few saved-looking visualizations and maps on the demo's data, so that
 * "Open a saved item" has something to open. Shaped as DHIS2 stores them,
 * with the fields the fake plugins read. */

const data = (...ids: string[]): Dimension => ({
    dimension: 'dx',
    items: ids.map((id) => ({ id, name: getDataItem(id)?.name })),
})

const periods = (...ids: string[]): Dimension => ({
    dimension: 'pe',
    items: ids.map((id) => ({ id })),
})

const orgUnits = (...ids: string[]): Dimension => ({
    dimension: 'ou',
    items: ids.map((id) => ({ id })),
})

export const DEMO_VISUALIZATIONS: VisualizationObject[] = [
    {
        id: 'DemoVisAnc1',
        name: 'ANC visits, last 12 months',
        type: 'LINE',
        columns: [data(DATA_ITEM_IDS.anc1, DATA_ITEM_IDS.anc4)],
        rows: [periods('LAST_12_MONTHS')],
        filters: [orgUnits('USER_ORGUNIT')],
    },
    {
        id: 'DemoVisMal1',
        name: 'Malaria cases by district, last 12 months',
        type: 'COLUMN',
        columns: [data(DATA_ITEM_IDS.malaria)],
        rows: [orgUnits('USER_ORGUNIT_CHILDREN')],
        filters: [periods('LAST_12_MONTHS')],
    },
    /* A line per district: clicks on it carry an org unit and a period */
    {
        id: 'DemoVisAnc2',
        name: 'ANC 1st visits by district, last 12 months',
        type: 'LINE',
        columns: [orgUnits('USER_ORGUNIT_CHILDREN')],
        rows: [periods('LAST_12_MONTHS')],
        filters: [data(DATA_ITEM_IDS.anc1)],
    },
    /* Weekly where malaria is reported weekly: the East and South lines
     * stay empty, as those districts report monthly */
    {
        id: 'DemoVisMal2',
        name: 'Malaria cases by district, last 12 weeks',
        type: 'LINE',
        columns: [orgUnits('USER_ORGUNIT_CHILDREN')],
        rows: [periods('LAST_12_WEEKS')],
        filters: [data(DATA_ITEM_IDS.malaria)],
    },
    /* A stock: a quarter shows its last month, not a sum */
    {
        id: 'DemoVisAct1',
        name: 'Antimalarial stock, last 4 quarters',
        type: 'COLUMN',
        columns: [data(DATA_ITEM_IDS.actStock)],
        rows: [periods('LAST_4_QUARTERS')],
        filters: [orgUnits('USER_ORGUNIT')],
    },
    {
        id: 'DemoVisPen1',
        name: 'Penta 3 coverage by chiefdom, last 4 quarters',
        type: 'PIVOT_TABLE',
        columns: [periods('LAST_4_QUARTERS')],
        rows: [orgUnits('USER_ORGUNIT', 'LEVEL-3')],
        filters: [data(DATA_ITEM_IDS.penta3)],
    },
]

export const DEMO_MAPS: MapObject[] = [
    {
        id: 'DemoMapPen1',
        name: 'Penta 3 coverage by chiefdom',
        mapViews: [
            {
                id: 'DemoMvPen01',
                layer: 'thematic',
                columns: [data(DATA_ITEM_IDS.penta3)],
                rows: [orgUnits('USER_ORGUNIT', 'LEVEL-3')],
                filters: [periods('LAST_12_MONTHS')],
                legendSet: { id: 'DemoLegCov1' },
            },
        ],
    },
    {
        id: 'DemoMapMal1',
        name: 'Malaria cases by district',
        mapViews: [
            {
                id: 'DemoMvMal01',
                layer: 'thematic',
                columns: [data(DATA_ITEM_IDS.malaria)],
                rows: [orgUnits('USER_ORGUNIT', 'LEVEL-2')],
                filters: [periods('LAST_3_MONTHS')],
                colorScale: '#fee5d9,#fcae91,#fb6a4a,#de2d26,#a50f15',
                classes: 5,
            },
        ],
    },
]
