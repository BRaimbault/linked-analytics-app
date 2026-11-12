import {
    fromSerializedGrid,
    getLeaves,
    VIEW_HEADER_HEIGHT,
    withViewInfo,
    type GridTree,
    type SerializedGrid,
} from '@modules/workspace/grid-tree'
import {
    computeEvenSizes,
    computeHeaderChangeSizes,
    computeLayoutSizes,
    computeViewChangeSizes,
    type SizeRequest,
} from '@modules/workspace/layout-sizing'
import type { LayoutChange } from '@modules/workspace/layout-targets'
import type { DockviewApi } from 'dockview-react'
import {
    getGroupPanel,
    getPanelKind,
    getPanelSizes,
    getViewGroups,
    getWorkspaceHeaderHeight,
} from './panels'

/* A plain copy of the grid's layout. dockview reports hidden sizes while
 * a view is maximized (and briefly restores the layout to serialize it,
 * which re-applies stale sizes), so there is none then. */
export const readGridTree = (api: DockviewApi): GridTree | null => {
    if (api.hasMaximizedGroup()) {
        return null
    }
    /* dockview types a node's data as a leaf's or a branch's whatever its
     * `type` says; ours ties the data to the type */
    const tree = fromSerializedGrid(
        api.toJSON().grid as unknown as SerializedGrid
    )
    if (tree.width <= 0 || tree.height <= 0) {
        return null
    }
    return withViewInfo(tree, (groupId) => {
        const panel = getGroupPanel(api, groupId)?.activePanel
        return { sizes: getPanelSizes(panel), kind: getPanelKind(panel) }
    })
}

const pausedSizing = new WeakSet<DockviewApi>()

/* Runs a change made of several dockview steps as one: sizes are neither
 * read nor fixed in between, while cells hold temporary panels (a swap
 * shows a spacer, which has other sizes than the view it stands for) */
export const withoutSizing = (api: DockviewApi, change: () => void): void => {
    pausedSizing.add(api)
    try {
        change()
    } finally {
        pausedSizing.delete(api)
    }
}

export const isSizingPaused = (api: DockviewApi): boolean =>
    pausedSizing.has(api)

/* A layout change about to happen, and the layout before it, so that
 * sizes can be put back in proportion once dockview has made it (see
 * setupWorkspace). A tab dropped at the outer edge reshapes the grid
 * before dockview announces the change (dockview 8.3.1 adds the new cell
 * without a layout event, then moves the view in as one change), so the
 * layout is read when the change is expected. Kept by view id: a moved
 * view may land in a new cell. */
type ExpectedChange =
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

/* The layout as it last stood, to size the grid when it changes size */
const lastLayouts = new WeakMap<DockviewApi, GridTree>()

const viewIdsOf = (tree: GridTree) =>
    getLeaves(tree.root)
        .map(({ id }) => id)
        .join()

/* When the grid itself changes size (the tools strip opens or changes tab,
 * the window resizes), dockview spreads the change over every line, so
 * lines of selectors alone would stretch past their content. They keep
 * their length instead, and the other lines share the change, as after a
 * layout change. A change of views is left to restoreProportions. */
export const keepLengthsOnResize = (api: DockviewApi): void => {
    const layout = isSizingPaused(api) ? null : readGridTree(api)
    if (!layout) {
        return
    }
    const last = lastLayouts.get(api)
    lastLayouts.set(api, layout)
    const isResized =
        last !== undefined &&
        viewIdsOf(last) === viewIdsOf(layout) &&
        (last.width !== layout.width || last.height !== layout.height)
    if (isResized) {
        applySizeRequests(api, computeLayoutSizes(last, layout))
    }
}

/* Each cell's minimum follows its view's. dockview takes a view's minimum
 * when the view is added, which a header change, or the new cell of a
 * moved view, would miss. */
const applyMinimumSizes = (api: DockviewApi): void => {
    for (const group of getViewGroups(api)) {
        const { min } = getPanelSizes(group.activePanel)
        group.api.setConstraints({
            minimumWidth: min.width,
            minimumHeight: min.height,
        })
    }
}

/* The header height the grid was last sized for */
const sizedHeaderHeights = new WeakMap<DockviewApi, number>()

/* Sizes the grid for its views as they are now: cells get their views'
 * minimums (after a layout, header or control change), and lines of
 * selectors alone keep fitting their content when the workspace shows or
 * hides headers. The layout is read first: dockview grows a cell to a
 * higher minimum at once. A maximized view hides the grid: a header
 * change waits until the grid is back. */
export const fitViewSizes = (api: DockviewApi): void => {
    const tree = readGridTree(api)
    applyMinimumSizes(api)
    if (!tree) {
        return
    }
    const headerHeight = getWorkspaceHeaderHeight(api)
    const sizedFor = sizedHeaderHeights.get(api) ?? VIEW_HEADER_HEIGHT
    sizedHeaderHeights.set(api, headerHeight)
    if (headerHeight !== sizedFor) {
        applySizeRequests(
            api,
            computeHeaderChangeSizes(tree, headerHeight - sizedFor)
        )
    }
}

/* After a view's own sizes changed (a selector's control): its cell takes
 * its new minimum, then its preferred size (computeViewChangeSizes) */
export const fitCellToView = (api: DockviewApi, viewId: string): void => {
    fitViewSizes(api)
    const tree = readGridTree(api)
    const cellId = api.getPanel(viewId)?.group.id
    if (tree && cellId) {
        applySizeRequests(api, computeViewChangeSizes(tree, cellId))
    }
}

/* Gives the views even sizes (computeEvenSizes). A maximized view hides
 * the grid, so maximize is left first. */
export const evenOutSizes = (api: DockviewApi): void => {
    if (api.hasMaximizedGroup()) {
        api.exitMaximizedGroup()
    }
    const tree = readGridTree(api)
    if (tree) {
        applySizeRequests(api, computeEvenSizes(tree))
    }
}
