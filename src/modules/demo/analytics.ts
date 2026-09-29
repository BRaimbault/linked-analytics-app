import type { DataClick } from '@modules/plugins/contract'
import type {
    Dimension,
    VisualizationObject,
} from '@modules/visualization/analytical-object'
import { resolveDataItems } from './data-items'
import { resolveOrgUnits } from './org-units'
import { getPeriodItemName, resolvePeriods } from './periods'
import { getTotal } from './values'

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
    const series = seriesDimension ? resolve(seriesDimension) : []
    const categories = categoryDimension ? resolve(categoryDimension) : []

    const valueOf = (seriesItem: AxisItem, category: AxisItem) => {
        const idsOf = (dimension: DemoDimension) => {
            const onAxis = [seriesItem, category].find(
                (item) => item.dimension === dimension
            )
            return onAxis
                ? [onAxis.id]
                : (all.get(dimension) ?? []).map(({ id }) => id)
        }
        /* Several data items in a filter add up, as counts do */
        const totals = idsOf('dx').map((dataItemId) =>
            getTotal(dataItemId, idsOf('ou'), idsOf('pe'))
        )
        if (!totals.length || totals.includes(null)) {
            return null
        }
        return (totals as number[]).reduce((sum, total) => sum + total, 0)
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

    return { series, categories, filters, valueOf }
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
