import type { DataClick } from '@modules/plugins/contract'
import type {
    Dimension,
    VisualizationObject,
} from '@modules/visualization/analytical-object'
import { getTotal } from './aggregation'
import {
    getDataItem,
    getLegendColor,
    getLegendSet,
    resolveDataItems,
} from './data-items'
import {
    getHierarchyName,
    getOrgUnit,
    resolveOrgUnits,
    type DemoOrgUnit,
} from './org-units'
import { checkPeriods, type PeriodNotice } from './period-check'
import { getPeriodItemName, resolvePeriods } from './periods'

/* The table a fake visualization draws, worked out from its object as
 * DV's analytics request reads it: the first dimension in columns gives
 * the series, the first in rows the categories, and every other dimension
 * filters the values. Only dx, pe and ou are known to the demo. */

type DemoDimension = 'dx' | 'pe' | 'ou'

export type AxisItem = {
    dimension: DemoDimension
    id: string
    name: string
    /* For org units: as DHIS2 writes them, and the level's UID */
    path?: string
    levelId?: string
}

export type DemoTable = {
    series: AxisItem[]
    categories: AxisItem[]
    /* What the filters hold, e.g. to show what a view is filtered by */
    filters: AxisItem[][]
    valueOf: (series: AxisItem, category: AxisItem) => number | null
    /* A value's color from its legend set, when the object colors values */
    legendColorOf: (series: AxisItem, category: AxisItem) => string | undefined
    legendStyle: 'FILL' | 'TEXT' | null
    /* Why some or all of the values are missing for these periods */
    notices: PeriodNotice[]
}

const isDemoDimension = (dimension: string): dimension is DemoDimension =>
    dimension === 'dx' || dimension === 'pe' || dimension === 'ou'

const resolve = ({ dimension, items }: Dimension): AxisItem[] => {
    const ids = items.map(({ id }) => id)
    switch (dimension) {
        case 'dx':
            return resolveDataItems(ids).map(({ id, name }) => ({
                dimension,
                id,
                name,
            }))
        case 'pe':
            return resolvePeriods(ids).map(({ id, name }) => ({
                dimension,
                id,
                name,
            }))
        default:
            return resolveOrgUnits(ids).map(({ id, name, path, levelId }) => ({
                dimension: 'ou',
                id,
                name,
                path,
                levelId,
            }))
    }
}

/* Org units named with their ancestors, "South / Juniper". DV's "show
 * hierarchy" starts from the country; the demo leaves its one country out,
 * as it adds nothing to a made-up geography. */
const withHierarchy = (item: AxisItem): AxisItem =>
    item.dimension === 'ou'
        ? {
              ...item,
              name: getHierarchyName(getOrgUnit(item.id) as DemoOrgUnit),
          }
        : item

export const buildDemoTable = (object: VisualizationObject): DemoTable => {
    const dimensions = [
        ...object.columns,
        ...object.rows,
        ...object.filters,
    ].filter(({ dimension }) => isDemoDimension(dimension))
    const [seriesDimension] = object.columns.filter(({ dimension }) =>
        isDemoDimension(dimension)
    )
    const [categoryDimension] = object.rows.filter(({ dimension }) =>
        isDemoDimension(dimension)
    )
    const all = new Map(
        dimensions.map((entry) => [entry.dimension, resolve(entry)])
    )
    const axis = (entry: Dimension | undefined) => {
        const items = entry ? resolve(entry) : []
        return object.showHierarchy ? items.map(withHierarchy) : items
    }
    const series = axis(seriesDimension)
    const categories = axis(categoryDimension)

    /* A cell's item where the dimension is on an axis, else every item */
    const idsAt = (
        seriesItem: AxisItem,
        category: AxisItem,
        dimension: DemoDimension
    ) => {
        const onAxis = [seriesItem, category].find(
            (item) => item.dimension === dimension
        )
        return onAxis
            ? [onAxis.id]
            : (all.get(dimension) ?? []).map(({ id }) => id)
    }

    const valueOf = (seriesItem: AxisItem, category: AxisItem) => {
        const idsOf = (dimension: DemoDimension) =>
            idsAt(seriesItem, category, dimension)
        /* Several data items in a filter add up, as counts do */
        const totals = idsOf('dx').map((dataItemId) =>
            getTotal(dataItemId, idsOf('ou'), idsOf('pe'))
        )
        if (!totals.length || totals.includes(null)) {
            return null
        }
        return (totals as number[]).reduce((sum, total) => sum + total, 0)
    }

    /* By data item, a value added up from several items has no legend */
    const legendSetOf = (seriesItem: AxisItem, category: AxisItem) => {
        const { legend } = object
        if (legend?.strategy === 'FIXED') {
            return legend.set && getLegendSet(legend.set.id)
        }
        const dataItemIds = idsAt(seriesItem, category, 'dx')
        const legendSetId =
            legend && dataItemIds.length === 1
                ? getDataItem(dataItemIds[0])?.legendSetId
                : undefined
        return legendSetId ? getLegendSet(legendSetId) : undefined
    }

    const legendColorOf = (seriesItem: AxisItem, category: AxisItem) => {
        const legendSet = legendSetOf(seriesItem, category)
        const value = legendSet ? valueOf(seriesItem, category) : null
        return legendSet && value !== null
            ? getLegendColor(legendSet, value)
            : undefined
    }

    /* A relative period keeps its own name, as DHIS2 shows a filter */
    const filters = object.filters
        .filter(({ dimension }) => isDemoDimension(dimension))
        .map((entry) =>
            entry.dimension === 'pe'
                ? entry.items.flatMap(({ id }) => {
                      const name = getPeriodItemName(id)
                      return name
                          ? [{ dimension: 'pe' as const, id, name }]
                          : []
                  })
                : resolve(entry)
        )

    const idsIn = (dimension: DemoDimension) =>
        (all.get(dimension) ?? []).map(({ id }) => id)
    const notices = checkPeriods(idsIn('dx'), idsIn('ou'), idsIn('pe'))

    return {
        series,
        categories,
        filters,
        valueOf,
        legendColorOf,
        legendStyle: object.legend?.style ?? null,
        notices,
    }
}

/* What a click on a point sends: the ids on its axes */
export const toDataClick = (...items: AxisItem[]): DataClick =>
    Object.fromEntries(
        items.map(({ dimension, id, name, path, levelId }) => [
            dimension,
            dimension === 'ou'
                ? { id, name, path, level: levelId }
                : { id, name },
        ])
    )
