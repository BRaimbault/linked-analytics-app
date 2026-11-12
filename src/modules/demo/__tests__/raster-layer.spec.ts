import { getAreaMean } from '@modules/demo/climate'
import { RASTER_LAYER_IDS } from '@modules/demo/data-items'
import { getOrgUnit, type DemoOrgUnit } from '@modules/demo/org-units'
import { getPeriod, type DemoPeriod } from '@modules/demo/periods'
import { buildDemoRasterLayer } from '@modules/demo/raster-layer'
import {
    PRECIPITATION_STYLE,
    TROPICAL_TEMPERATURE_STYLE,
} from '@modules/demo/raster-styles'
import type { MapView } from '@modules/visualization/analytical-object'
import type { RasterLayerConfig } from '@modules/visualization/raster-layer-config'
import { describe, expect, it } from 'vitest'

const COUNTRY_CELLS = (getOrgUnit('DemoLand001') as DemoOrgUnit).cells.length

const rasterView = (
    config: Partial<RasterLayerConfig>,
    { ou = ['USER_ORGUNIT', 'LEVEL-2'], labels = false } = {}
): MapView => ({
    layer: 'earthEngine',
    columns: [],
    rows: [{ dimension: 'ou', items: ou.map((id) => ({ id })) }],
    filters: [],
    labels,
    config: JSON.stringify({
        id: RASTER_LAYER_IDS.precipitation,
        period: { id: '202607' },
        ...config,
    }),
})

const build = (...args: Parameters<typeof rasterView>) =>
    buildDemoRasterLayer(rasterView(...args))

describe('demo raster layer', () => {
    it('draws its month over the land, under the outlines of its org units with their means', () => {
        const layer = build({})
        const south = layer?.features.find(
            ({ orgUnit }) => orgUnit.id === 'DemoSouth01'
        )

        expect(layer?.name).toBe('Precipitation monthly ERA5')
        expect(layer?.unit).toBe('millimeter')
        expect(layer?.periodNames).toEqual(['July 2026'])
        expect(layer?.monthId).toBe('202607')
        /* The country's cells and a ring around them, cut to its outline
         * where it's drawn */
        expect(layer?.raster?.cells.length).toBeGreaterThan(COUNTRY_CELLS)
        expect(layer?.raster?.cells.length).toBeLessThan(COUNTRY_CELLS * 1.5)
        expect(layer?.features).toHaveLength(4)
        expect(south?.color).toBe('transparent')
        expect(south?.label).toBeNull()
        expect(south?.value).toBe(
            getAreaMean(
                'total_precipitation_sum',
                south?.orgUnit as DemoOrgUnit,
                getPeriod('202607') as DemoPeriod
            )
        )
        expect(layer?.outlines).toHaveLength(1)
        expect(layer?.dataRange).toBeNull()
        expect(layer?.dataItem).toBeNull()
    })

    it("lists Maps' legend, highest first, with no class below a masked minimum", () => {
        expect(build({})?.legend.map(({ label }) => label)).toEqual([
            '> 700',
            '600 – 700',
            '500 – 600',
            '400 – 500',
            '300 – 400',
            '200 – 300',
            '100 – 200',
            '0 – 100',
        ])
        const temperature = build({
            id: RASTER_LAYER_IDS.temperature,
            style: TROPICAL_TEMPERATURE_STYLE,
        })
        expect(temperature?.legend.at(0)?.label).toBe('> 34')
        expect(temperature?.legend.at(-1)?.label).toBe('< 20')
    })

    it('leaves out the cells at or below a masked minimum, and colors the rest in its steps', () => {
        const wet = build({ style: { ...PRECIPITATION_STYLE, min: 500 } })
        const cells = wet?.raster?.cells ?? []

        expect(cells.length).toBeGreaterThan(0)
        expect(cells.length).toBeLessThan(COUNTRY_CELLS)
        expect(
            cells.every(({ color }) =>
                PRECIPITATION_STYLE.palette.includes(color)
            )
        ).toBe(true)
    })

    it('puts values beyond its range in the classes below and above it', () => {
        const colors = (min: number, max: number) =>
            new Set(
                build({
                    id: RASTER_LAYER_IDS.temperature,
                    style: { ...TROPICAL_TEMPERATURE_STYLE, min, max },
                })?.raster?.cells.map(({ color }) => color)
            )
        const { palette } = TROPICAL_TEMPERATURE_STYLE

        expect(colors(40, 54)).toEqual(new Set([palette[0]]))
        expect(colors(0, 14)).toEqual(new Set([palette.at(-1)]))
    })

    it('shows the band asked for, or the layer’s first', () => {
        const band = (value?: string) =>
            build({ id: RASTER_LAYER_IDS.temperature, band: value })
                ?.features[0].value as number

        expect(band('temperature_2m_max')).toBeGreaterThan(band())
        expect(band('nope')).toBe(band('temperature_2m'))
    })

    it('finds the month a linked period falls in, a week included', () => {
        const linked = (startDate: string, endDate: string) =>
            build({ period: { startDate, endDate } })?.monthId

        expect(linked('2026-03-01', '2026-03-31')).toBe('202603')
        /* Monday 29 June to Sunday 5 July: most of its days are in July */
        expect(linked('2026-06-29', '2026-07-05')).toBe('202607')
        expect(linked('2020-01-01', '2020-01-31')).toBeNull()
    })

    it('keeps the month it showed for a longer period, and says why', () => {
        const quarter = buildDemoRasterLayer(
            rasterView({
                period: { startDate: '2026-04-01', endDate: '2026-06-30' },
            }),
            '202605'
        )

        expect(quarter?.monthId).toBe('202605')
        expect(quarter?.notices).toEqual([
            {
                dataItem: 'Precipitation monthly ERA5',
                collectedIn: 'MONTHLY',
                askedIn: 'QUARTERLY',
                places: [],
            },
        ])
        /* Two months are no demo period to name */
        const twoMonths = build({
            period: { startDate: '2026-04-01', endDate: '2026-05-31' },
        })
        expect(twoMonths?.raster).toBeNull()
        expect(twoMonths?.notices).toEqual([])
    })

    it('draws no raster without a month: no period, or a saved one longer than a month', () => {
        expect(build({ period: undefined })?.raster).toBeNull()
        expect(build({ period: { id: '2026Q2' } })?.raster).toBeNull()
        expect(
            build({ period: { id: '2026Q2' } })?.features[0].value
        ).toBeNull()
    })

    it('names its org units when it shows labels, and outlines no parent of the country', () => {
        const country = build({}, { ou: ['USER_ORGUNIT'], labels: true })

        expect(country?.features[0].label).toBe('Demoland')
        expect(country?.outlines).toEqual([])
    })

    it('draws nothing for a layer the demo does not know, or another kind of layer', () => {
        expect(build({ id: 'nope' })).toBeNull()
        expect(
            buildDemoRasterLayer({ ...rasterView({}), layer: 'thematic' })
        ).toBeNull()
    })
})
