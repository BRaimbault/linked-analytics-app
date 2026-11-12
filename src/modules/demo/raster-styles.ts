import type { RasterStyle } from '@modules/visualization/raster-layer-config'

/* Maps' default styles for ERA5-Land's monthly layers (maps-app
 * src/constants/earthEngineLayers) */
export const PRECIPITATION_STYLE: RasterStyle = {
    min: 0,
    max: 700,
    palette: [
        '#f7fbff',
        '#deebf7',
        '#c6dbef',
        '#9ecae1',
        '#6baed6',
        '#4292c6',
        '#2171b5',
        '#084594',
    ],
}

export const TEMPERATURE_STYLE: RasterStyle = {
    min: 0,
    max: 35,
    palette: [
        '#fff5f0',
        '#fee0d2',
        '#fcbba1',
        '#fc9272',
        '#fb6a4a',
        '#ef3b2c',
        '#cb181d',
        '#a50f15',
        '#67000d',
    ],
}

/* Maps' reds on a range that fits the tropics, where 0 to 35 °C would put
 * a whole country in one or two classes */
export const TROPICAL_TEMPERATURE_STYLE: RasterStyle = {
    ...TEMPERATURE_STYLE,
    min: 20,
    max: 34,
}
