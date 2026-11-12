import { dateOf } from './calendar'
import type { Point } from './land-grid'
import type { DemoOrgUnit } from './org-units'
import type { DemoPeriod } from './periods'
import { seededRandom } from './values'

/* The demo's climate: monthly surfaces over the land, as the ERA5-Land
 * dataset gives them. Maps draws them as raster layers; the climate app
 * imports an org unit's mean over its area as a data value. The pattern is the West
 * African coast's: a rainy season from May to October, heaviest in August
 * and on the south-west coast, where the rain comes in from the sea; the
 * hottest months at the end of the dry season, and the inland north-east
 * hotter, with wider swings between day and night. */

/* The bands of ERA5-Land's monthly layers, as Maps and the climate app
 * name them: millimetres of rain, degrees Celsius */
export type ClimateBand =
    | 'total_precipitation_sum'
    | 'temperature_2m'
    | 'temperature_2m_max'
    | 'temperature_2m_min'

/* The share of a year's rain each month brings, January first */
const RAIN_SHARE = [
    0.01, 0.01, 0.02, 0.05, 0.09, 0.13, 0.19, 0.21, 0.15, 0.09, 0.03, 0.02,
]

/* The mean temperature each month, January first: coolest in the rains */
const MEAN_TEMPERATURE = [
    27, 27.8, 28.3, 28.2, 27.4, 26.3, 25.3, 25, 25.6, 26.3, 26.8, 26.8,
]

/* How far the hottest days are from the coldest nights, widest in the dry
 * season */
const DAY_NIGHT_RANGE = [11, 11.5, 10.5, 9, 8, 7, 6, 6, 6.5, 7.5, 9, 10.5]

/* Weather that differs from month to month: a broad wave across the land,
 * its direction and place drawn from the month */
const weather = ([x, y]: Point, periodId: string, strength: number) => {
    const angle = seededRandom(`${periodId}:angle`) * 2 * Math.PI
    const phase = seededRandom(`${periodId}:phase`) * 2 * Math.PI
    const along = x * Math.cos(angle) + y * Math.sin(angle)
    return strength * Math.sin(0.06 * along + phase)
}

/* About 2,000 mm a year inland in the north-east, 3,300 on the south-west
 * coast (the plane's y runs south) */
const yearlyRain = ([x, y]: Point) => 1900 + 20 * (y - 0.3 * x)

/* Degrees above the coast's temperature, inland to the north-east */
const inland = ([x, y]: Point) => 0.025 * (x - y)

/* A band's value at a point of the land, for a month */
export const getSurfaceValue = (
    band: ClimateBand,
    point: Point,
    month: DemoPeriod
): number => {
    const index = dateOf(month.start).month - 1
    if (band === 'total_precipitation_sum') {
        return (
            yearlyRain(point) *
            RAIN_SHARE[index] *
            (1 + weather(point, month.id, 0.15))
        )
    }
    const mean =
        MEAN_TEMPERATURE[index] + inland(point) + weather(point, month.id, 0.4)
    /* The month's hottest day and coldest night, a little beyond the
     * usual swing */
    const swing = (DAY_NIGHT_RANGE[index] + 2 * inland(point)) / 2 + 1
    switch (band) {
        case 'temperature_2m_max':
            return mean + swing
        case 'temperature_2m_min':
            return mean - swing
        default:
            return mean
    }
}

const areaMeans = new Map<string, number>()

/* An org unit's value for a month: the surface's mean over its cells, as
 * a raster is reduced over an area, to a tenth */
export const getAreaMean = (
    band: ClimateBand,
    orgUnit: DemoOrgUnit,
    month: DemoPeriod
): number => {
    const key = `${band}:${orgUnit.id}:${month.id}`
    const cached = areaMeans.get(key)
    if (cached !== undefined) {
        return cached
    }
    const sum = orgUnit.cells.reduce(
        (total, cell) => total + getSurfaceValue(band, cell, month),
        0
    )
    const mean = Math.round((sum / orgUnit.cells.length) * 10) / 10
    areaMeans.set(key, mean)
    return mean
}
