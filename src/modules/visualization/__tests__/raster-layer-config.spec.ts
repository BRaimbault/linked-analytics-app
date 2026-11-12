import type { MapView } from '@modules/visualization/analytical-object'
import {
    readRasterLayerConfig,
    withRasterLayerConfig,
} from '@modules/visualization/raster-layer-config'
import { describe, expect, it } from 'vitest'

const view: MapView = {
    layer: 'earthEngine',
    columns: [],
    rows: [],
    filters: [],
}

describe('raster layer config', () => {
    it('reads back what it writes', () => {
        const config = { id: 'layer', band: 'band', period: { id: '202607' } }

        expect(
            readRasterLayerConfig(withRasterLayerConfig(view, config))
        ).toEqual(config)
    })

    it('reads nothing from another kind of layer, or from a config that is not JSON', () => {
        expect(readRasterLayerConfig(view)).toBeNull()
        expect(readRasterLayerConfig({ ...view, config: '{' })).toBeNull()
        expect(
            readRasterLayerConfig({ ...view, layer: 'thematic', config: '{}' })
        ).toBeNull()
    })
})
