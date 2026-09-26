import {
    fromSerializedGrid,
    withViewSizes,
    type GridTree,
    type SerializedGrid,
} from '@modules/workspace/grid-tree'
import {
    computeLayoutSizes,
    type LayoutChange,
    type SizeRequest,
} from '@modules/workspace/layout-sizing'
import type { DockviewApi } from 'dockview-react'
import { getGroupPanel, getPanelSizes, getViewGroups } from './panels'

/* A plain copy of the grid's layout. dockview reports hidden sizes while
 * a view is maximized (and briefly restores the layout to serialize it,
 * which re-applies stale sizes), so there is none then. */
export const readGridTree = (api: DockviewApi): GridTree | null => {
    if (api.hasMaximizedGroup()) {
        return null
    }
    const tree = fromSerializedGrid(
        api.toJSON().grid as unknown as SerializedGrid
    )
    if (tree.width <= 0 || tree.height <= 0) {
        return null
    }
    return withViewSizes(tree, (groupId) =>
        getPanelSizes(getGroupPanel(api, groupId)?.activePanel)
    )
}

/* A layout change about to happen, and the layout before it, so that
 * sizes can be put back in proportion once dockview has made it (see
 * setupWorkspace). A tab dropped at the outer edge reshapes the grid
 * before dockview announces the change, so the layout is read when the
 * change is expected. Kept by view id: a moved view may land in a new
 * cell. Kept until the current task ends, as a move to the outer edge
 * reaches dockview as two changes (a new cell, then the view moving in),
 * and sizes are fixed after each. */
export type ExpectedChange =
    | { kind: 'split'; viewId: string; targetGroupId: string }
    | { kind: 'insert'; viewId: string }

const expectedChanges = new WeakMap<
    DockviewApi,
    { change: ExpectedChange; before: GridTree | null }
>()

export const expectLayoutChange = (
    api: DockviewApi,
    change: ExpectedChange
): void => {
    expectedChanges.set(api, { change, before: readGridTree(api) })
    /* dockview makes its changes within the current task */
    queueMicrotask(() => expectedChanges.delete(api))
}

const toLayoutChange = (
    api: DockviewApi,
    change: ExpectedChange
): LayoutChange | undefined => {
    const placedId = api.getPanel(change.viewId)?.group.id
    if (!placedId) {
        return undefined
    }
    return change.kind === 'split'
        ? { kind: 'split', placedId, targetId: change.targetGroupId }
        : { kind: 'insert', placedId }
}

const applySizeRequests = (api: DockviewApi, requests: SizeRequest[]): void => {
    for (const { id, ...size } of requests) {
        api.getGroup(id)?.api.setSize(size)
    }
}

/* The gridview's top-left corner in the page, where its first cell starts */
export const getGridOrigin = (
    api: DockviewApi
): { left: number; top: number } => {
    const rects = getViewGroups(api).map((group) =>
        group.element.getBoundingClientRect()
    )
    return {
        left: Math.min(...rects.map((rect) => rect.left)),
        top: Math.min(...rects.map((rect) => rect.top)),
    }
}

/* dockview spreads space evenly whenever the grid changes; this puts the
 * sizes back in proportion with the layout before the change */
export const restoreProportions = (
    api: DockviewApi,
    layoutBefore: GridTree | null
): void => {
    const expected = expectedChanges.get(api)
    const before = expected?.before ?? layoutBefore
    const after = readGridTree(api)
    if (!after || !before) {
        return
    }
    const change = expected && toLayoutChange(api, expected.change)
    applySizeRequests(api, computeLayoutSizes(before, after, change))
}
