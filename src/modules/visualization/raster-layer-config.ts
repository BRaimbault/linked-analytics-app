import type { MapView } from './analytical-object'

/* A raster layer's settings (precipitation, temperature, population…).
 * Maps saves such a layer as `layer: 'earthEngine'`, its settings as a
 * JSON string in the map view's config (maps-app src/util/favorites.js). */

export type RasterStyle = { min: number; max: number; palette: string[] }

/* A raster layer and band, as a layer's config names them, and a style
 * to show them in */
export type RasterSource = {
    layerId: string
    band: string
    style?: RasterStyle
}

/* A saved period names its image (e.g. 202608). A linked one gives a
 * DHIS2 period's first and last days, for the plugin to find the image:
 * only Maps can look images up (docs/interactions.md, Raster layer
 * periods). */
export type RasterPeriod =
    { id: string } | { startDate: string; endDate: string }

export type RasterLayerConfig = {
    /* The layer, e.g. ECMWF/ERA5_LAND/MONTHLY_AGGR/temperature_2m */
    id: string
    band?: string
    style?: RasterStyle
    period?: RasterPeriod
}

/* Null for another kind of layer, or a config that can't be read */
export const readRasterLayerConfig = (
    view: MapView
): RasterLayerConfig | null => {
    if (view.layer !== 'earthEngine' || !view.config) {
        return null
    }
    try {
        return JSON.parse(view.config) as RasterLayerConfig
    } catch {
        return null
    }
}

export const withRasterLayerConfig = (
    view: MapView,
    config: RasterLayerConfig
): MapView => ({ ...view, config: JSON.stringify(config) })
