import { getPeriodType, toPeriodType } from '@modules/interactions/periods'
import type { PluginObject } from '@modules/plugins/contract'
import {
    findDimension,
    type Dimension,
    type DimensionItem,
    type MapObject,
    type MapView,
    type VisualizationObject,
} from '@modules/visualization/analytical-object'

/* Rewrites a view's object with the values it receives, as the dashboard
 * does for its filters (getFilteredVisualization), with the rules of
 * docs/interactions.md §2:
 * - ou on an axis (a bar per district, a choropleth) becomes the units the
 *   view shows for the selection: itself, its sub-units or its
 *   sub-x2-units; in a filter, the selection itself (its sub-units would
 *   add up to the same);
 * - pe in a filter is the selection; on an axis, the periods of the
 *   axis's own type within the selection, or the one containing it;
 * - dx replaces a view's one data item (a map layer takes the first); a
 *   view comparing several keeps those of its own that were picked, and
 *   stays as it is when none were.
 * An org unit or period the object lacks is added to its filters. */

export type LinkItem = DimensionItem & { path?: string }

export type IncomingLinks = Partial<Record<'ou' | 'pe' | 'dx', LinkItem[]>>

/* How many levels below the selection a view shows, as the org unit
 * picker's "sub-units" and "sub-x2-units" */
export type OrgUnitDepth = 0 | 1 | 2

export const DEFAULT_ORG_UNIT_DEPTH: OrgUnitDepth = 1

export type ApplyLinksOptions = {
    /* The deepest org unit level: nothing is shown below it */
    orgUnitLevelCount: number
    orgUnitDepth: OrgUnitDepth
    /* A data item's own legend set, which a map layer takes with it */
    getLegendSetId: (dataItemId: string) => string | undefined
}

type LaidOut = Pick<VisualizationObject, 'columns' | 'rows' | 'filters'>

const isOnAxis = (object: LaidOut, dimension: string) =>
    [...object.columns, ...object.rows].some(
        (entry) => entry.dimension === dimension
    )

const levelOf = ({ path }: LinkItem) =>
    path ? path.split('/').filter(Boolean).length : null

/* The units at the view's depth within the selection, stopping at the
 * deepest level: a unit there shows itself */
const unitsBelow = (
    items: LinkItem[],
    { orgUnitLevelCount, orgUnitDepth }: ApplyLinksOptions
): DimensionItem[] => {
    const levels = new Set(
        items
            .map(levelOf)
            .filter(
                (level): level is number =>
                    level !== null && level < orgUnitLevelCount
            )
            .map(
                (level) =>
                    `LEVEL-${Math.min(level + orgUnitDepth, orgUnitLevelCount)}`
            )
    )
    return [
        ...items.map(({ id, name }) => ({ id, name })),
        ...(orgUnitDepth > 0 ? [...levels].map((id) => ({ id })) : []),
    ]
}

const periodsFor = (
    items: LinkItem[],
    current: Dimension | undefined
): DimensionItem[] => {
    const axisType = current && getPeriodType(current.items[0]?.id ?? '')
    if (!axisType) {
        return items.map(({ id, name }) => ({ id, name }))
    }
    const ids = items.flatMap(({ id }) => toPeriodType(id, axisType))
    return [...new Set(ids)].map((id) => ({ id }))
}

/* The data items a view shows for the ones picked, or null to keep its
 * own: a view without data items is left as it is too */
const dataItemsFor = (
    items: LinkItem[],
    current: Dimension | undefined
): DimensionItem[] | null => {
    if (!current) {
        return null
    }
    if (current.items.length <= 1) {
        return items.map(({ id, name }) => ({ id, name }))
    }
    const kept = current.items.filter(({ id }) =>
        items.some((item) => item.id === id)
    )
    return kept.length ? kept : null
}

const replaceItems = <T extends LaidOut>(
    object: T,
    dimension: string,
    items: DimensionItem[]
): T => {
    const replace = (entries: Dimension[]) =>
        entries.map((entry) =>
            entry.dimension === dimension ? { ...entry, items } : entry
        )
    const has = [...object.columns, ...object.rows, ...object.filters].some(
        (entry) => entry.dimension === dimension
    )
    return {
        ...object,
        columns: replace(object.columns),
        rows: replace(object.rows),
        filters: has
            ? replace(object.filters)
            : [...object.filters, { dimension, items }],
    }
}

const rewrite = <T extends LaidOut>(
    object: T,
    incoming: IncomingLinks,
    options: ApplyLinksOptions
): T => {
    let result = object
    if (incoming.ou?.length) {
        result = replaceItems(
            result,
            'ou',
            isOnAxis(object, 'ou')
                ? unitsBelow(incoming.ou, options)
                : incoming.ou.map(({ id, name }) => ({ id, name }))
        )
    }
    if (incoming.pe?.length) {
        const current = isOnAxis(object, 'pe')
            ? [...object.columns, ...object.rows].find(
                  (entry) => entry.dimension === 'pe'
              )
            : undefined
        result = replaceItems(result, 'pe', periodsFor(incoming.pe, current))
    }
    if (incoming.dx?.length) {
        const dataItems = dataItemsFor(incoming.dx, findDimension(object, 'dx'))
        if (dataItems) {
            result = replaceItems(result, 'dx', dataItems)
        }
    }
    return result
}

/* A layer's legend set belongs to its data item: with another item, the
 * layer takes that item's legend set, or automatic classes without one */
const withLegendOf = (
    view: MapView,
    dataItemId: string,
    { getLegendSetId }: ApplyLinksOptions
): MapView => {
    const { legendSet, ...rest } = view
    const legendSetId = legendSet && getLegendSetId(dataItemId)
    return legendSetId ? { ...rest, legendSet: { id: legendSetId } } : rest
}

/* A thematic layer shows one data item */
const rewriteThematicLayer = (
    view: MapView,
    incoming: IncomingLinks,
    options: ApplyLinksOptions
): MapView => {
    const [dataItem] = incoming.dx ?? []
    const currentId = findDimension(view, 'dx')?.items[0]?.id
    const rewritten = rewrite(
        view,
        { ...incoming, dx: dataItem && [dataItem] },
        options
    )
    return dataItem && currentId && dataItem.id !== currentId
        ? withLegendOf(rewritten, dataItem.id, options)
        : rewritten
}

const isMap = (object: PluginObject): object is MapObject =>
    'mapViews' in object

export const applyLinks = <T extends PluginObject>(
    object: T,
    incoming: IncomingLinks,
    options: ApplyLinksOptions
): T => {
    if (!incoming.ou?.length && !incoming.pe?.length && !incoming.dx?.length) {
        return object
    }
    if (isMap(object)) {
        return {
            ...object,
            mapViews: object.mapViews.map((view: MapView) =>
                view.layer === 'thematic'
                    ? rewriteThematicLayer(view, incoming, options)
                    : view
            ),
        }
    }
    /* A custom title would go stale: the subtitle shows the filters */
    const visualization: VisualizationObject = {
        ...(object as VisualizationObject),
    }
    delete visualization.title
    delete visualization.subtitle
    return rewrite(visualization, incoming, options) as T
}
