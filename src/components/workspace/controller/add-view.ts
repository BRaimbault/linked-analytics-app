import {
    getBalancedSplitOrder,
    type SplitDirection,
} from '@modules/workspace/balanced-split'
import { getBarPlacement, type BarKind } from '@modules/workspace/bar-placement'
import type { SplitAxis, ViewSizes } from '@modules/workspace/grid-tree'
import { canAddView, getNextViewNumber } from '@modules/workspace/view-limits'
import {
    getViewKind,
    getViewTitle,
    getViewTypeSizes,
    type ViewType,
} from '@modules/workspace/view-types'
import type {
    AddPanelPositionOptions,
    DockviewApi,
    DockviewGroupPanel,
} from 'dockview-react'
import { expectLayoutChange, readGridTree } from './grid-layout'
import {
    getViewGroups,
    getViewPanels,
    toWorkspaceView,
    VIEW_COMPONENT,
    type ViewPanelParams,
} from './panels'
import { hasRoomToSplit } from './room'

/* Where a new view goes, and how the sizes follow: a split halves the
 * reference cell, an insert adds a new line (see computeLayoutSizes) */
type Placement = {
    position: AddPanelPositionOptions
    sizing: 'split' | 'insert'
}

const SPLIT_AXIS: Record<SplitDirection, SplitAxis> = {
    right: 'horizontal',
    below: 'vertical',
}

const getArea = (group: DockviewGroupPanel): number =>
    group.api.width * group.api.height

/* A click halves the largest cell, the way that keeps views balanced
 * (getBalancedSplitOrder), or else the other way, or the next largest cell
 * with room. Exact placement is for drags. Returns null when no cell has
 * room. */
const getDefaultPlacement = (
    api: DockviewApi,
    placedSizes: ViewSizes
): Placement | null => {
    const groups = getViewGroups(api)
    if (!groups.length) {
        return { position: { direction: 'right' }, sizing: 'insert' }
    }
    const tree = readGridTree(api)
    const largestFirst = [...groups].sort((a, b) => getArea(b) - getArea(a))
    for (const group of largestFirst) {
        const directions = getBalancedSplitOrder(tree, {
            id: group.id,
            width: group.api.width,
            height: group.api.height,
        })
        const direction = directions.find((candidate) =>
            hasRoomToSplit(group, SPLIT_AXIS[candidate], placedSizes)
        )
        if (direction) {
            return {
                position: { referenceGroup: group, direction },
                sizing: 'split',
            }
        }
    }
    return null
}

/* A clicked text or selector view joins its bar across the top, or starts
 * one (see getBarPlacement); it is a new line either way */
const getClickedBarPlacement = (
    api: DockviewApi,
    kind: BarKind,
    sizes: ViewSizes
): Placement | null => {
    const tree = readGridTree(api)
    const placement = tree && getBarPlacement(tree, kind, sizes)
    if (!placement) {
        return null
    }
    return {
        position:
            'edge' in placement
                ? { direction: 'above' }
                : {
                      referenceGroup: placement.referenceId,
                      direction: placement.direction,
                  },
        sizing: 'insert',
    }
}

type AddViewResult =
    | { status: 'added'; viewId: string }
    | { status: 'full' }
    | { status: 'no-room' }
    | { status: 'maximized' }

const getReferenceGroupId = (
    position: AddPanelPositionOptions
): string | null => {
    if (!('referenceGroup' in position) || !position.referenceGroup) {
        return null
    }
    const reference = position.referenceGroup
    return typeof reference === 'string' ? reference : reference.id
}

export const addView = (
    api: DockviewApi,
    type: ViewType,
    {
        placement,
        sizing,
    }: {
        placement?: AddPanelPositionOptions
        /* A split halves the reference cell; an insert adds a new line.
         * Defaults to a split when there is a reference cell. */
        sizing?: 'split' | 'insert'
    } = {}
): AddViewResult => {
    const views = getViewPanels(api).map(toWorkspaceView)
    if (!canAddView(type, views)) {
        return { status: 'full' }
    }
    /* A maximized view hides the grid: the new view would land out of
     * sight (the palette's tiles are disabled then) */
    if (api.hasMaximizedGroup()) {
        return { status: 'maximized' }
    }
    const kind = getViewKind(type)
    const sizes = getViewTypeSizes(type)
    const given: Placement | null = placement
        ? {
              position: placement,
              sizing:
                  sizing ??
                  (getReferenceGroupId(placement) ? 'split' : 'insert'),
          }
        : null
    const chosen =
        given ??
        (kind === 'plugin' ? null : getClickedBarPlacement(api, kind, sizes)) ??
        getDefaultPlacement(api, sizes)
    if (!chosen) {
        return { status: 'no-room' }
    }
    const { position } = chosen
    const number = getNextViewNumber(type, views)
    const params: ViewPanelParams = { type, number }
    const viewId = `${type}-${crypto.randomUUID()}`
    const targetGroupId = getReferenceGroupId(position)
    expectLayoutChange(
        api,
        chosen.sizing === 'split' && targetGroupId
            ? { kind: 'split', viewId, targetGroupId }
            : { kind: 'insert', viewId }
    )
    api.addPanel({
        id: viewId,
        component: VIEW_COMPONENT,
        title: getViewTitle(type, number),
        params,
        renderer: 'always',
        position,
        minimumWidth: sizes.min.width,
        minimumHeight: sizes.min.height,
    })
    return { status: 'added', viewId }
}
