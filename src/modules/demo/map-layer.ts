import type { MapView } from '@modules/visualization/analytical-object'
import { getDimensionItemIds } from '@modules/visualization/analytical-object'
import { getTotal } from './aggregation'
import { getDataItem, getLegendColor, getLegendSet } from './data-items'
import type { Point } from './land-grid'
import { getOrgUnit, resolveOrgUnits, type DemoOrgUnit } from './org-units'
import { checkPeriods, type PeriodNotice } from './period-check'
import { getPeriodItemName, resolvePeriods } from './periods'
import type { Ring, Shape } from './shapes'

/* What a fake map draws for a thematic layer, worked out from its map
 * view as the Maps app reads one: dx in columns, ou in rows, pe in
 * filters. Each org unit is colored by its value, from the layer's legend
 * set or else its color scale in equal intervals (the DHIS2 default). */

export type MapFeature = {
    orgUnit: DemoOrgUnit
    value: number | null
    color: string
    /* The feature's label when the layer shows labels, and where: its own
     * name, as Maps' default label template ('{name}') gives */
    label: string | null
    labelAt: Point
}

const ringArea = (ring: Ring) =>
    ring.reduce(
        (sum, [x, y], index) =>
            sum +
            x * ring[(index + 1) % ring.length][1] -
            ring[(index + 1) % ring.length][0] * y,
        0
    ) / 2

/* The centroid of a shape's largest part, its mainland rather than an
 * island, where its name reads best */
export const getLabelPoint = (shape: Shape): Point => {
    const ring = [...shape].sort(
        (a, b) => Math.abs(ringArea(b)) - Math.abs(ringArea(a))
    )[0]
    const area = ringArea(ring)
    const [sumX, sumY] = ring.reduce(
        ([accX, accY], [x, y], index) => {
            const [nextX, nextY] = ring[(index + 1) % ring.length]
            const cross = x * nextY - nextX * y
            return [accX + (x + nextX) * cross, accY + (y + nextY) * cross]
        },
        [0, 0]
    )
    return [sumX / (6 * area), sumY / (6 * area)]
}

export type LegendEntry = { color: string; label: string }

/* The values an automatic legend's classes span */
export type ClassRange = { min: number; max: number }

export type DemoMapLayer = {
    dataItem: { id: string; name: string } | null
    periodNames: string[]
    features: MapFeature[]
    /* The outlines of the units the features lie in, drawn over them */
    outlines: Shape[]
    legend: LegendEntry[]
    /* The range of the values shown, which automatic classes fit; none
     * with a legend set, whose classes are fixed */
    dataRange: ClassRange | null
    /* Why some or all of the features have no value for these periods */
    notices: PeriodNotice[]
}

/* Maps' defaults: ColorBrewer's YlOrBr in 5 classes, and its no data gray */
export const DEFAULT_COLOR_SCALE = '#ffffd4,#fed98e,#fe9929,#d95f0e,#993404'
export const NO_DATA_COLOR = '#cccccc'

const format = (value: number) =>
    value.toLocaleString('en', { maximumFractionDigits: 1 })

/* Values outside the range take the first or last class, as Maps clamps
 * them */
const equalIntervals = (
    { min, max }: ClassRange,
    colors: string[]
): { entries: LegendEntry[]; colorOf: (value: number) => string } => {
    const step = (max - min) / colors.length || 1
    const classOf = (value: number) =>
        Math.max(
            0,
            Math.min(colors.length - 1, Math.floor((value - min) / step))
        )
    return {
        entries: colors.map((color, index) => ({
            color,
            label: `${format(min + step * index)} – ${format(
                min + step * (index + 1)
            )}`,
        })),
        colorOf: (value) => colors[classOf(value)],
    }
}

/* `classRange` fixes automatic classes (a locked legend); without it,
 * they fit the values shown */
export const buildDemoMapLayer = (
    view: MapView,
    classRange?: ClassRange
): DemoMapLayer => {
    const dataItem = getDataItem(getDimensionItemIds(view, 'dx')[0] ?? '')
    const periodItems = getDimensionItemIds(view, 'pe')
    const periodIds = resolvePeriods(periodItems).map(({ id }) => id)
    const orgUnits = resolveOrgUnits(getDimensionItemIds(view, 'ou'))
    const values = orgUnits.map((orgUnit) =>
        dataItem ? getTotal(dataItem.id, [orgUnit.id], periodIds) : null
    )
    const known = values.filter((value): value is number => value !== null)

    const legendSet = view.legendSet && getLegendSet(view.legendSet.id)
    const colors = (view.colorScale ?? DEFAULT_COLOR_SCALE)
        .split(',')
        .slice(0, view.classes ?? 5)
    const dataRange = known.length
        ? { min: Math.min(...known), max: Math.max(...known) }
        : { min: 0, max: 0 }
    const intervals = equalIntervals(classRange ?? dataRange, colors)
    const colorOf = (value: number | null) => {
        if (value === null) {
            return NO_DATA_COLOR
        }
        if (legendSet) {
            return getLegendColor(legendSet, value) ?? NO_DATA_COLOR
        }
        return intervals.colorOf(value)
    }

    const parentIds = new Set(
        orgUnits.flatMap(({ parentId }) => (parentId ? [parentId] : []))
    )

    return {
        dataItem: dataItem ? { id: dataItem.id, name: dataItem.name } : null,
        periodNames: periodItems.flatMap(
            (item) => getPeriodItemName(item) ?? []
        ),
        features: orgUnits.map((orgUnit, index) => ({
            orgUnit,
            value: values[index],
            color: colorOf(values[index]),
            label: view.labels ? orgUnit.name : null,
            labelAt: getLabelPoint(orgUnit.shape),
        })),
        outlines: [...parentIds].map(
            (id) => (getOrgUnit(id) as DemoOrgUnit).shape
        ),
        /* Highest class first, as Maps lists them */
        legend: (legendSet
            ? legendSet.legends.map(({ color, name }) => ({
                  color,
                  label: name,
              }))
            : intervals.entries
        ).toReversed(),
        dataRange: legendSet ? null : dataRange,
        notices: dataItem
            ? checkPeriods(
                  [dataItem.id],
                  orgUnits.map(({ id }) => id),
                  periodIds
              )
            : [],
    }
}
