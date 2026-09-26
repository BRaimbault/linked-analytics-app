import { decodeViewDrag, VIEW_DRAG_MIME } from '@modules/workspace/drag-payload'
import { isAllowedDrop, isSwapDrop } from '@modules/workspace/drop-rules'
import { PLUGIN_SIZES, type Rect } from '@modules/workspace/grid-tree'
import {
    getInsertZones,
    type InsertZone,
} from '@modules/workspace/insert-zones'
import {
    getPanelData,
    positionToDirection,
    type AddPanelPositionOptions,
    type DockviewApi,
    type DockviewDidDropEvent,
    type DockviewGroupPanel,
    type DockviewWillDropEvent,
    type DockviewWillShowOverlayLocationEvent,
    type Position,
} from 'dockview-react'
import { addView } from './add-view'
import {
    getAddableDraggedType,
    getDraggedPanel,
    getDraggedSizes,
    getDraggedView,
    getDragFormats,
    getDropContext,
} from './drags'
import { expectLayoutChange, getGridOrigin, readGridTree } from './grid-layout'
import { getGroupPanel, isEdgeGroup } from './panels'
import { hasRoomForDrop } from './room'
import { swapViews } from './swap-views'

/* A palette tile dropped anywhere: adds its view, placed as given */
const addDroppedTile = (
    api: DockviewApi,
    dataTransfer: DataTransfer | null | undefined,
    options?: Parameters<typeof addView>[2]
): void => {
    const type = decodeViewDrag(dataTransfer?.getData(VIEW_DRAG_MIME))
    if (type) {
        addView(api, type, options)
    }
}

/* The strips where the current drag can insert a view as a new line,
 * placed relative to the container element. None for a tool tab or for a
 * palette tile the workspace has no room left for. */
export const getInsertZonesForDrag = (
    api: DockviewApi,
    container: Element,
    formats: readonly string[]
): InsertZone[] => {
    const view = getDraggedView(api)
    const placedSizes = getDraggedSizes(api, getPanelData(), formats)
    const tree = placedSizes && readGridTree(api)
    if (!placedSizes || !tree) {
        return []
    }
    const origin = getGridOrigin(api)
    const bounds = container.getBoundingClientRect()
    const toContainer = (rect: Rect): Rect => ({
        ...rect,
        left: rect.left + origin.left - bounds.left,
        top: rect.top + origin.top - bounds.top,
    })
    return getInsertZones(tree, {
        sourceId: view?.group.id ?? null,
        placedSizes,
    }).map((zone) => ({ ...zone, rect: toContainer(zone.rect) }))
}

export const canDropOnInsertZone = (
    api: DockviewApi,
    dataTransfer: DataTransfer | null
): boolean =>
    getPanelData()
        ? Boolean(getDraggedView(api))
        : Boolean(getAddableDraggedType(api, dataTransfer?.types))

/* dockview has no drop target on an empty grid once its outer edges are
 * off, so the empty grid's own message takes palette tiles */
export const canDropOnEmptyGrid = (
    api: DockviewApi,
    dataTransfer: DataTransfer | null
): boolean =>
    !getPanelData() && Boolean(getAddableDraggedType(api, dataTransfer?.types))

export const dropOnEmptyGrid = (
    api: DockviewApi,
    dataTransfer: DataTransfer | null
): void => {
    addDroppedTile(api, dataTransfer)
}

export const dropOnInsertZone = (
    api: DockviewApi,
    zone: InsertZone,
    dataTransfer: DataTransfer | null
): void => {
    /* No reference view: a new line at the grid's outer edge */
    const reference =
        zone.referenceId === null ? null : getGroupPanel(api, zone.referenceId)
    if (reference === undefined) {
        return
    }
    const direction = positionToDirection(zone.position)
    if (getPanelData()) {
        const view = getDraggedView(api)
        if (!view) {
            return
        }
        expectLayoutChange(api, { kind: 'insert', viewId: view.id })
        /* Without a target, a group moves into a new cell at the edge */
        const target = reference ? view.api : view.group.api
        target.moveTo({
            group: reference ?? undefined,
            position: zone.position,
        })
        return
    }
    addDroppedTile(api, dataTransfer, {
        placement: reference
            ? { referenceGroup: reference, direction }
            : { direction },
        sizing: 'insert',
    })
}

export const getDropPlacement = (
    group: DockviewGroupPanel | undefined,
    position: Position
): AddPanelPositionOptions => {
    const direction = positionToDirection(position)
    return group && !isEdgeGroup(group)
        ? { referenceGroup: group, direction }
        : { direction: direction === 'within' ? 'right' : direction }
}

type UnhandledDragOverEvent = Parameters<
    Parameters<DockviewApi['onUnhandledDragOver']>[0]
>[0]

/* The handlers below take dockview's own drop events: drops on its cells,
 * and on touch on its outer edges */

/* A palette tile is a drag dockview doesn't know; it takes it while there
 * is room for one more of its type */
export const acceptPaletteDrag = (
    api: DockviewApi,
    event: UnhandledDragOverEvent
): void => {
    if (getAddableDraggedType(api, getDragFormats(event.nativeEvent))) {
        event.accept()
    }
}

/* No preview where the drop isn't allowed or has no room */
export const refuseDisallowedDrop = (
    api: DockviewApi,
    event: DockviewWillShowOverlayLocationEvent
): void => {
    const tree = readGridTree(api)
    const context = getDropContext(api, event, tree)
    const dragged =
        context.source === 'view'
            ? getDraggedPanel(api, event.getData())
            : undefined
    const placedSizes = getDraggedSizes(
        api,
        event.getData(),
        getDragFormats(event.nativeEvent)
    )
    const hasRoom = hasRoomForDrop(tree, {
        group: event.group,
        position: event.position,
        sourceGroupId: dragged?.group.id ?? null,
        placedSizes: placedSizes ?? PLUGIN_SIZES,
    })
    if (!isAllowedDrop(context) || !hasRoom) {
        event.preventDefault()
    }
}

/* A view dropped on the middle of another swaps them; any other view drop
 * is a move, whose sizes are fixed once dockview has made it */
export const swapOrExpectMove = (
    api: DockviewApi,
    event: DockviewWillDropEvent
): void => {
    const context = getDropContext(api, event, readGridTree(api))
    const dragged = getDraggedPanel(api, event.getData())
    const target = event.group?.activePanel
    if (isSwapDrop(context)) {
        event.preventDefault()
        if (dragged && target) {
            swapViews(api, dragged, target)
        }
        return
    }
    if (context.source === 'view' && dragged) {
        expectLayoutChange(
            api,
            event.group && !context.targetIsEdgeGroup
                ? {
                      kind: 'split',
                      viewId: dragged.id,
                      targetGroupId: event.group.id,
                  }
                : { kind: 'insert', viewId: dragged.id }
        )
    }
}

export const addTileDroppedOnGrid = (
    api: DockviewApi,
    event: DockviewDidDropEvent
): void => {
    const native = event.nativeEvent
    addDroppedTile(api, 'dataTransfer' in native ? native.dataTransfer : null, {
        placement: getDropPlacement(event.group, event.position),
    })
}
