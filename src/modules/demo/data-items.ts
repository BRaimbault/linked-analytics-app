import type { RasterSource } from '@modules/visualization/raster-layer-config'
import type { ClimateBand } from './climate'
import type { PeriodType } from './periods'
import {
    PRECIPITATION_STYLE,
    TEMPERATURE_STYLE,
    TROPICAL_TEMPERATURE_STYLE,
} from './raster-styles'

/* The demo's data items, collected and aggregated as DHIS2 does it, so the
 * demo shows what linking periods runs into: counts collected monthly, or
 * weekly in some districts and monthly in others; a yearly population,
 * which analytics repeats into shorter periods; a stock, whose value for a
 * quarter is its last month's; a coverage indicator worked out from two of
 * them; and climate data the climate app imports. Names follow the dev
 * server's demo database, so the demo reads like the real one; the numbers
 * are made up. */

/* The aggregation types the demo uses, as DHIS2 names them; climate data
 * takes the ones the climate app advises */
export type ClimateAggregationType = 'SUM' | 'AVERAGE' | 'MAX' | 'MIN'
export type DemoAggregationType =
    ClimateAggregationType | 'AVERAGE_SUM_ORG_UNIT' | 'LAST'

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
    /* Climate data the climate app imported from a raster layer */
    importedFrom?: ClimateSource
    chartStyle?: ChartStyle
}

/* How to chart a data element: DHIS2 keeps no such hint, the demo proposes
 * it, so a chart that a data pick switches to it shows it as it should be
 * read (an amount in columns, a level in a line), in the colors of its
 * map. A chart of several takes their colors, and keeps its own type. */
export type ChartStyle = { type: 'COLUMN' | 'LINE'; color: string }

/* The raster layer and band a data element was imported from, and the
 * style to show it in. DHIS2 keeps no such link on a data element: the
 * demo proposes it, so a raster can follow a data pick. */
export type ClimateSource = RasterSource & { band: ClimateBand }

/* Imported at every aggregation level, as the climate app advises: each org
 * unit holds its own values, its area's mean, rather than the sum of the
 * units below it */
export type DemoClimateElement = DemoDataElement & {
    aggregationType: ClimateAggregationType
    importedFrom: ClimateSource
}

export const isClimateElement = (
    element: DemoDataElement
): element is DemoClimateElement => element.importedFrom !== undefined

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
    malariaVaccine3: 'DemoMalVC31',
    malariaVaccine3Doses: 'DemoMalVD31',
    populationUnder1: 'DemoPopU1y1',
    malaria: 'DemoMalar01',
    malariaIncidence: 'DemoMalInc1',
    population: 'DemoPopTot1',
    actStock: 'DemoActStk1',
    precipitation: 'DemoPrecip1',
    temperature: 'DemoTemp001',
    temperatureMax: 'DemoTempMx1',
    temperatureMin: 'DemoTempMn1',
} as const

/* Maps' layer ids for ERA5-Land's monthly precipitation and temperature */
export const RASTER_LAYER_IDS = {
    precipitation: 'ECMWF/ERA5_LAND/MONTHLY_AGGR/total_precipitation_sum',
    temperature: 'ECMWF/ERA5_LAND/MONTHLY_AGGR/temperature_2m',
} as const

/* The bands WHO AFRO reports immunization coverage in, around the targets
 * of 80% in every district and 90% nationally. Colors from the middle of
 * ColorBrewer's RdYlGn, a scale Maps offers: light enough to fill a table
 * cell under dark text. */
export const LEGEND_SETS: DemoLegendSet[] = [
    {
        id: 'DemoLegCov1',
        name: 'Coverage',
        legends: [
            { startValue: 0, endValue: 50, color: '#fc8d59', name: '< 50%' },
            {
                startValue: 50,
                endValue: 80,
                color: '#fee08b',
                name: '50 – 79%',
            },
            {
                startValue: 80,
                endValue: 90,
                color: '#d9ef8b',
                name: '80 – 89%',
            },
            { startValue: 90, endValue: 1000, color: '#91cf60', name: '≥ 90%' },
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
    /* Given at the same routine visits as Penta, since 2024, so it reaches
     * the children Penta reaches, a little fewer as it's newer */
    {
        id: DATA_ITEM_IDS.malariaVaccine3,
        name: 'Malaria vaccine 3 coverage <1y',
        dimensionItemType: 'INDICATOR',
        numeratorId: DATA_ITEM_IDS.malariaVaccine3Doses,
        denominatorId: DATA_ITEM_IDS.populationUnder1,
        factor: 100,
        annualized: true,
        legendSetId: 'DemoLegCov1',
    },
    {
        id: DATA_ITEM_IDS.malariaVaccine3Doses,
        name: 'Malaria vaccine 3rd doses given',
        dimensionItemType: 'DATA_ELEMENT',
        aggregationType: 'SUM',
        collectedIn: 'MONTHLY',
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
    /* Cases per 1,000 people a year, so places of different sizes compare:
     * a map of counts would mostly show where people live */
    {
        id: DATA_ITEM_IDS.malariaIncidence,
        name: 'Malaria incidence per 1,000',
        dimensionItemType: 'INDICATOR',
        numeratorId: DATA_ITEM_IDS.malaria,
        denominatorId: DATA_ITEM_IDS.population,
        factor: 1000,
        annualized: true,
    },
    {
        id: DATA_ITEM_IDS.population,
        name: 'Total population',
        dimensionItemType: 'DATA_ELEMENT',
        aggregationType: 'AVERAGE_SUM_ORG_UNIT',
        collectedIn: 'YEARLY',
    },
    {
        id: DATA_ITEM_IDS.actStock,
        name: 'Antimalarial (ACT) stock on hand',
        dimensionItemType: 'DATA_ELEMENT',
        aggregationType: 'LAST',
        collectedIn: 'MONTHLY',
    },
    /* Imported monthly by the climate app, named after its datasets */
    {
        id: DATA_ITEM_IDS.precipitation,
        name: 'Precipitation (ERA5-Land)',
        dimensionItemType: 'DATA_ELEMENT',
        aggregationType: 'SUM',
        collectedIn: 'MONTHLY',
        importedFrom: {
            layerId: RASTER_LAYER_IDS.precipitation,
            band: 'total_precipitation_sum',
        },
        chartStyle: { type: 'COLUMN', color: PRECIPITATION_STYLE.palette[6] },
    },
    {
        id: DATA_ITEM_IDS.temperature,
        name: 'Air temperature (ERA5-Land)',
        dimensionItemType: 'DATA_ELEMENT',
        aggregationType: 'AVERAGE',
        collectedIn: 'MONTHLY',
        importedFrom: {
            layerId: RASTER_LAYER_IDS.temperature,
            band: 'temperature_2m',
            style: TROPICAL_TEMPERATURE_STYLE,
        },
        chartStyle: { type: 'LINE', color: TEMPERATURE_STYLE.palette[5] },
    },
    {
        id: DATA_ITEM_IDS.temperatureMax,
        name: 'Max air temperature (ERA5-Land)',
        dimensionItemType: 'DATA_ELEMENT',
        aggregationType: 'MAX',
        collectedIn: 'MONTHLY',
        importedFrom: {
            layerId: RASTER_LAYER_IDS.temperature,
            band: 'temperature_2m_max',
            style: TROPICAL_TEMPERATURE_STYLE,
        },
        chartStyle: { type: 'LINE', color: TEMPERATURE_STYLE.palette[7] },
    },
    {
        id: DATA_ITEM_IDS.temperatureMin,
        name: 'Min air temperature (ERA5-Land)',
        dimensionItemType: 'DATA_ELEMENT',
        aggregationType: 'MIN',
        collectedIn: 'MONTHLY',
        importedFrom: {
            layerId: RASTER_LAYER_IDS.temperature,
            band: 'temperature_2m_min',
            style: TROPICAL_TEMPERATURE_STYLE,
        },
        chartStyle: { type: 'LINE', color: TEMPERATURE_STYLE.palette[3] },
    },
]

const byId = new Map(DATA_ITEMS.map((item) => [item.id, item]))

export const getDataItem = (id: string): DemoDataItem | undefined =>
    byId.get(id)

/* A data item's chart style, if it has one */
export const getChartStyle = (dataItemId: string): ChartStyle | undefined => {
    const item = byId.get(dataItemId)
    return item?.dimensionItemType === 'DATA_ELEMENT'
        ? item.chartStyle
        : undefined
}

/* The data items an analytics request's dx items stand for; unknown ids
 * are dropped */
export const resolveDataItems = (items: string[]): DemoDataItem[] =>
    items.flatMap((id) => byId.get(id) ?? [])

export const getLegendSet = (id: string): DemoLegendSet | undefined =>
    LEGEND_SETS.find((legendSet) => legendSet.id === id)

/* A legend includes its start value but not its end value, as in DHIS2 */
export const getLegendColor = (
    legendSet: DemoLegendSet,
    value: number
): string | undefined =>
    legendSet.legends.find(
        ({ startValue, endValue }) => value >= startValue && value < endValue
    )?.color

/* The period type a data element is collected in, in a district */
export const collectionTypeOf = (
    { collectedIn, collectedInByDistrict }: DemoDataElement,
    districtId: string
): PeriodType => collectedInByDistrict?.[districtId] ?? collectedIn
