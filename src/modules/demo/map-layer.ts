import type { MapView } from '@modules/visualization/analytical-object'
import { getDimensionItemIds } from '@modules/visualization/analytical-object'
import { getDataItem, getLegendSet } from './data-items'
import { getOrgUnit, resolveOrgUnits, type DemoOrgUnit } from './org-units'
import { getPeriodItemName, resolvePeriods } from './periods'
import type { Shape } from './shapes'
import { getTotal } from './values'

/* What a fake map draws for a thematic layer, worked out from its map
 * view as the Maps app reads one: dx in columns, ou in rows, pe in
 * filters. Each org unit is colored by its value, from the layer's legend
 * set or else its color scale in equal intervals (the DHIS2 default). */

export type MapFeature = {
    orgUnit: DemoOrgUnit
    value: number | null
    color: string
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
}

const DEFAULT_COLOR_SCALE = '#ffffcc,#c2e699,#78c679,#31a354,#006837'
const NO_DATA_COLOR = '#e0e0e0'

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
            return (
                legendSet.legends.find(
                    ({ startValue, endValue }) =>
                        value >= startValue && value < endValue
                )?.color ?? NO_DATA_COLOR
            )
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
        })),
        outlines: [...parentIds].map(
            (id) => (getOrgUnit(id) as DemoOrgUnit).shape
        ),
        legend: legendSet
            ? legendSet.legends.map(({ color, name }) => ({
                  color,
                  label: name,
              }))
            : intervals.entries,
        dataRange: legendSet ? null : dataRange,
    }
}
