import {
    getDimensionItemIds,
    type MapView,
} from '@modules/visualization/analytical-object'
import {
    readRasterLayerConfig,
    type RasterPeriod,
    type RasterStyle,
} from '@modules/visualization/raster-layer-config'
import { dayOf } from './calendar'
import { getAreaMean, getSurfaceValue, type ClimateBand } from './climate'
import { RASTER_LAYER_IDS } from './data-items'
import { CELL_SIZE, type Point } from './land-grid'
import {
    getLabelPoint,
    type DemoMapLayer,
    type DemoRaster,
    type LegendEntry,
} from './map-layer'
import { getOrgUnit, resolveOrgUnits, type DemoOrgUnit } from './org-units'
import { getPeriod, PERIODS, PERIODS_BY_TYPE, type DemoPeriod } from './periods'
import { PRECIPITATION_STYLE, TEMPERATURE_STYLE } from './raster-styles'

/* What a fake map draws for a raster layer, as Maps draws one: the month's
 * raster over the land, colored in the legend's steps, under the outlines
 * of the layer's org units, each with its mean over its area (maps-app
 * EarthEngineLayer, maps-gl getClassifiedImage). */

type Dataset = {
    name: string
    unit: string
    /* The first is the default */
    bands: ClimateBand[]
    style: RasterStyle
    /* Precipitation hides the land with none */
    masksMin: boolean
}

/* Maps' ERA5-Land monthly layers (maps-app src/constants/earthEngineLayers) */
const DATASETS: Record<string, Dataset> = {
    [RASTER_LAYER_IDS.precipitation]: {
        name: 'Precipitation monthly ERA5',
        unit: 'millimeter',
        bands: ['total_precipitation_sum'],
        style: PRECIPITATION_STYLE,
        masksMin: true,
    },
    [RASTER_LAYER_IDS.temperature]: {
        name: 'Temperature monthly',
        unit: '°C',
        bands: ['temperature_2m', 'temperature_2m_min', 'temperature_2m_max'],
        style: TEMPERATURE_STYLE,
        masksMin: false,
    },
}

const format = (value: number) =>
    value.toLocaleString('en', { maximumFractionDigits: 1 })

/* Equal steps from min to max, a class below min unless the layer masks
 * those values, and one above max (maps-app createLegend) */
const createLegend = (
    { min, max, palette }: RasterStyle,
    showBelowMin: boolean
) => {
    const below = showBelowMin ? 1 : 0
    const steps = palette.length - below - 1
    const step = (max - min) / steps
    const entries = palette.map((color, index): LegendEntry => {
        const at = index - below
        if (at < 0) {
            return { color, label: `< ${format(min)}` }
        }
        if (at === steps) {
            return { color, label: `> ${format(max)}` }
        }
        return {
            color,
            label: `${format(min + step * at)} – ${format(min + step * (at + 1))}`,
        }
    })
    const colorOf = (value: number) => {
        const at = Math.min(steps, Math.floor((value - min) / step))
        return palette[Math.max(0, at + below)]
    }
    return { entries, colorOf }
}

const dayFromIso = (iso: string) => {
    const [year, month, date] = iso.split('-').map(Number)
    return dayOf(year, month, date)
}

const LONGEST_MONTH = 31

type Image = { month: DemoPeriod | null; asked: DemoPeriod | null }

/* The month whose image the layer shows: its saved month, or the month a
 * linked period falls in (a week in the month holding most of its days).
 * A longer period has no image on a monthly layer: `asked` names it, and
 * the layer keeps the month it showed. */
const findImage = (
    period: RasterPeriod | undefined,
    shownMonthId: string | undefined
): Image => {
    if (!period) {
        return { month: null, asked: null }
    }
    if ('id' in period) {
        const saved = getPeriod(period.id)
        return {
            month: saved?.periodType === 'MONTHLY' ? saved : null,
            asked: null,
        }
    }
    const start = dayFromIso(period.startDate)
    const end = dayFromIso(period.endDate)
    if (end - start + 1 <= LONGEST_MONTH) {
        const middle = Math.floor((start + end) / 2)
        const month = PERIODS_BY_TYPE.MONTHLY.find(
            (candidate) => candidate.start <= middle && middle <= candidate.end
        )
        return { month: month ?? null, asked: null }
    }
    const kept = shownMonthId ? getPeriod(shownMonthId) : undefined
    return {
        month: kept ?? null,
        asked:
            PERIODS.find(
                (candidate) =>
                    candidate.start === start && candidate.end === end
            ) ?? null,
    }
}

/* The band and style a layer shows of its dataset */
type Shown = { band: ClimateBand; dataset: Dataset; style: RasterStyle }

/* The layer's org units' cells and the ring around them. The map cuts the
 * raster to their boundaries, as Maps clips the image to them (maps-gl
 * clipToCollection), and the ring fills them to the edge. */
const coveringCells = (orgUnits: DemoOrgUnit[]): Point[] => {
    const byIndex = new Map<string, Point>()
    for (const [x, y] of orgUnits.flatMap(({ cells }) => cells)) {
        for (const dx of [-1, 0, 1]) {
            for (const dy of [-1, 0, 1]) {
                const at: Point = [x + dx * CELL_SIZE, y + dy * CELL_SIZE]
                const index = at.map((value) => Math.round(value / CELL_SIZE))
                byIndex.set(index.join(), at)
            }
        }
    }
    return [...byIndex.values()]
}

const toRaster = (
    { band, dataset, style }: Shown,
    month: DemoPeriod,
    orgUnits: DemoOrgUnit[]
): DemoRaster => {
    const { colorOf } = createLegend(style, !dataset.masksMin)
    return {
        cellSize: CELL_SIZE,
        cells: coveringCells(orgUnits).flatMap((at) => {
            const value = getSurfaceValue(band, at, month)
            return dataset.masksMin && value <= style.min
                ? []
                : [{ at, color: colorOf(value) }]
        }),
    }
}

/* `shownMonthId`: the month the layer showed last, which it keeps when a
 * linked period has no image. Null for a layer the demo doesn't know. */
export const buildDemoRasterLayer = (
    view: MapView,
    shownMonthId?: string
): (DemoMapLayer & { monthId: string | null }) | null => {
    const config = readRasterLayerConfig(view)
    const dataset = config && DATASETS[config.id]
    if (!config || !dataset) {
        return null
    }
    const band = dataset.bands.find((candidate) => candidate === config.band)
    const shown: Shown = {
        band: band ?? dataset.bands[0],
        dataset,
        style: config.style ?? dataset.style,
    }
    const { month, asked } = findImage(config.period, shownMonthId)
    const orgUnits = resolveOrgUnits(getDimensionItemIds(view, 'ou'))
    const parentIds = new Set(
        orgUnits.flatMap(({ parentId }) => (parentId ? [parentId] : []))
    )

    return {
        dataItem: null,
        name: dataset.name,
        unit: dataset.unit,
        periodNames: month ? [month.name] : [],
        features: orgUnits.map((orgUnit) => ({
            orgUnit,
            value: month ? getAreaMean(shown.band, orgUnit, month) : null,
            color: 'transparent',
            label: view.labels ? orgUnit.name : null,
            labelAt: getLabelPoint(orgUnit.shape),
        })),
        outlines: [...parentIds].map(
            (id) => (getOrgUnit(id) as DemoOrgUnit).shape
        ),
        /* Highest class first, as Maps lists them */
        legend: createLegend(
            shown.style,
            !dataset.masksMin
        ).entries.toReversed(),
        dataRange: null,
        notices: asked
            ? [
                  {
                      dataItem: dataset.name,
                      collectedIn: 'MONTHLY',
                      askedIn: asked.periodType,
                      places: [],
                  },
              ]
            : [],
        raster: month ? toRaster(shown, month, orgUnits) : null,
        monthId: month?.id ?? null,
    }
}
