import { applyLinks } from '@modules/interactions/apply-links'
import type {
    MapObject,
    MapView,
} from '@modules/visualization/analytical-object'
import { getDimensionItemIds } from '@modules/visualization/analytical-object'
import {
    readRasterLayerConfig,
    type RasterSource,
} from '@modules/visualization/raster-layer-config'
import { describe, expect, it } from 'vitest'

const RAIN = 'ERA5/total_precipitation_sum'
const HEAT = 'ERA5/temperature_2m'
const STYLE = { min: 0, max: 700, palette: ['#fff', '#00f'] }
const WARM = { min: 20, max: 34, palette: ['#fee', '#f00'] }

/* Data elements imported from a raster layer, one with a style of its own */
const SOURCES: Record<string, RasterSource> = {
    rain: { layerId: RAIN, band: 'total_precipitation_sum' },
    heat: { layerId: HEAT, band: 'temperature_2m', style: WARM },
    heatMax: { layerId: RAIN, band: 'temperature_2m_max' },
}

const OPTIONS = {
    orgUnitLevelCount: 3,
    orgUnitDepth: 1,
    getLegendSetId: () => undefined,
    getRasterSource: (id: string) => SOURCES[id],
} as const

const raster: MapView = {
    layer: 'earthEngine',
    columns: [],
    rows: [
        { dimension: 'ou', items: [{ id: 'USER_ORGUNIT' }, { id: 'LEVEL-2' }] },
    ],
    filters: [],
    config: JSON.stringify({
        id: RAIN,
        band: 'total_precipitation_sum',
        style: STYLE,
        period: { id: '202607' },
    }),
}

const map = (...mapViews: MapView[]): MapObject => ({
    name: 'Climate',
    mapViews,
})

const south = {
    id: 'DemoSouth01',
    name: 'South',
    path: '/DemoLand001/DemoSouth01',
}

const linkedLayer = (
    incoming: Parameters<typeof applyLinks>[1],
    view = raster
) => applyLinks(map(view), incoming, OPTIONS).mapViews[0]

describe('applyLinks on a raster layer', () => {
    it('shows the units below a picked org unit, as a thematic layer does', () => {
        expect(getDimensionItemIds(linkedLayer({ ou: [south] }), 'ou')).toEqual(
            ['DemoSouth01', 'LEVEL-3']
        )
    })

    it('gives a picked period’s first and last days, for the plugin to find the image', () => {
        expect(
            readRasterLayerConfig(linkedLayer({ pe: [{ id: '202603' }] }))
                ?.period
        ).toEqual({ startDate: '2026-03-01', endDate: '2026-03-31' })
        /* A week has no dates links know of: the saved month stays */
        expect(
            readRasterLayerConfig(linkedLayer({ pe: [{ id: '2026W4' }] }))
                ?.period
        ).toEqual({ id: '202607' })
    })

    it('switches to the layer a picked data element was imported from, in its style', () => {
        const config = readRasterLayerConfig(
            linkedLayer({ dx: [{ id: 'heat' }] })
        )

        expect(config).toMatchObject({
            id: HEAT,
            band: 'temperature_2m',
            style: WARM,
        })
    })

    it('takes the new layer’s own style, or keeps its own on the same layer', () => {
        const other = readRasterLayerConfig(
            linkedLayer(
                { dx: [{ id: 'rain' }] },
                { ...raster, config: JSON.stringify({ id: HEAT, style: WARM }) }
            )
        )
        expect(other?.id).toBe(RAIN)
        expect(other?.style).toBeUndefined()

        const sameLayer = readRasterLayerConfig(
            linkedLayer({ dx: [{ id: 'heatMax' }] })
        )
        expect(sameLayer?.band).toBe('temperature_2m_max')
        expect(sameLayer?.style).toEqual(STYLE)
    })

    it('stays as it is for a data item with no raster layer', () => {
        expect(linkedLayer({ dx: [{ id: 'anc' }] })).toEqual({
            ...raster,
            config: raster.config,
        })
    })

    it('takes org units even when its config can’t be read, and leaves other layers alone', () => {
        const unreadable = linkedLayer(
            { ou: [south] },
            { ...raster, config: '{' }
        )
        expect(unreadable.config).toBe('{')
        expect(getDimensionItemIds(unreadable, 'ou')).toEqual([
            'DemoSouth01',
            'LEVEL-3',
        ])

        const facilities: MapView = { ...raster, layer: 'facility' }
        expect(linkedLayer({ ou: [south] }, facilities)).toBe(facilities)
    })
})
