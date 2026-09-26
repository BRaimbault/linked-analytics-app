import { getDraggedViewType } from '@modules/workspace/drag-payload'
import {
    isNoOpMove,
    type DragSource,
    type DropContext,
} from '@modules/workspace/drop-rules'
import type { GridTree, ViewSizes } from '@modules/workspace/grid-tree'
import { canAddView } from '@modules/workspace/view-limits'
import { getViewTypeSizes, type ViewType } from '@modules/workspace/view-types'
import {
    getPanelData,
    type DockviewApi,
    type DockviewGroupPanel,
    type IDockviewPanel,
    type Position,
} from 'dockview-react'
import {
    getGroupPanel,
    getPanelSizes,
    getViewPanels,
    isEdgeGroup,
    isToolPanelId,
    isViewPanel,
    toWorkspaceView,
} from './panels'

export type DragData = { panelId: string | null; groupId: string } | undefined

/* A tab drag carries the panel; a drag from a group's header carries only
 * the group, whose tab is its view */
export const getDraggedPanel = (
    api: DockviewApi,
    data: DragData
): IDockviewPanel | undefined => {
    if (!data) {
        return undefined
    }
    return data.panelId
        ? api.getPanel(data.panelId)
        : getGroupPanel(api, data.groupId)?.activePanel
}

/* Judged by id: a tool's tab stays a tool even once it is gone */
const getDragSource = (
    data: DragData,
    panel: IDockviewPanel | undefined
): DragSource => {
    const id = data?.panelId ?? panel?.id
    if (!id) {
        return 'external'
    }
    return isToolPanelId(id) ? 'tool' : 'view'
}

export type DropEvent = {
    kind: DropContext['kind']
    position: Position
    group?: DockviewGroupPanel
    getData: () => DragData
}

export const getDropContext = (
    api: DockviewApi,
    event: DropEvent,
    tree: GridTree | null
): DropContext => {
    const data = event.getData()
    const panel = getDraggedPanel(api, data)
    const source = getDragSource(data, panel)
    const targetIsEdgeGroup = isEdgeGroup(event.group)
    const sourceGroupId = source === 'view' ? panel?.group.id : undefined
    return {
        kind: event.kind,
        position: event.position,
        targetIsEdgeGroup,
        targetHoldsSource: Boolean(
            panel && event.group?.panels.includes(panel)
        ),
        source,
        gridIsEmpty: getViewPanels(api).length === 0,
        isNoOpMove: Boolean(
            sourceGroupId &&
            tree &&
            isNoOpMove(
                tree,
                sourceGroupId,
                event.group && !targetIsEdgeGroup
                    ? {
                          type: 'cell',
                          id: event.group.id,
                          position: event.position,
                      }
                    : { type: 'edge', position: event.position }
            )
        ),
    }
}

/* The formats a drag carries; none for a touch drag */
export const getDragFormats = (
    event: DragEvent | PointerEvent
): readonly string[] | undefined =>
    'dataTransfer' in event ? event.dataTransfer?.types : undefined

/* The view type a palette drag carries, if there is room for one more */
export const getAddableDraggedType = (
    api: DockviewApi,
    formats: readonly string[] | undefined
): ViewType | null => {
    const type = getDraggedViewType(formats)
    return type && canAddView(type, getViewPanels(api).map(toWorkspaceView))
        ? type
        : null
}

/* The view being dragged by its tab (or its group's header), if any */
export const getDraggedView = (
    api: DockviewApi
): IDockviewPanel | undefined => {
    const panel = getDraggedPanel(api, getPanelData())
    return panel && isViewPanel(panel) ? panel : undefined
}

/* The sizes of what is dragged: a view by its tab (or its group's header),
 * or a palette tile while there is room for one more of its type. Null for
 * anything else, like a tool's tab. */
export const getDraggedSizes = (
    api: DockviewApi,
    tabDrag: DragData,
    formats: readonly string[] | undefined
): ViewSizes | null => {
    if (tabDrag) {
        const panel = getDraggedPanel(api, tabDrag)
        return panel && isViewPanel(panel) ? getPanelSizes(panel) : null
    }
    const type = getAddableDraggedType(api, formats)
    return type ? getViewTypeSizes(type) : null
}
