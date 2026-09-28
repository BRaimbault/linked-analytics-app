import {
    getDraggedViewType,
    VIEW_DRAG_MIME,
} from '@modules/workspace/drag-payload'
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
    isFixedToolPanelId,
    WORKSPACE_PANEL_ID,
    getSettingsViewId,
    isViewSettingsPanel,
} from './panels'
import { getDraggedTile } from './tile-drag'

type DragData = { panelId: string | null; groupId: string } | undefined

/* A tab drag carries the panel; a drag from a group's header carries only
 * the group, whose tab is its view */
const getDraggedPanel = (
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

type DropEvent = {
    kind: DropContext['kind']
    position: Position
    group?: DockviewGroupPanel
    nativeEvent: DragEvent | PointerEvent
    getData: () => DragData
}

/* On a tab, a drop lands before it on its first half: its left, or its top
 * in a strip on the left or right edge */
const BEFORE_TAB: readonly Position[] = ['left', 'top']

/* The tab under the pointer. dockview's event names the group's shown
 * panel, not the tab dropped on; its position is the side of that tab. */
const getTargetTabId = ({ clientX, clientY }: MouseEvent): string | null =>
    document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('.dv-tab')
        ?.dataset.tabPanelId ?? null

/* Nothing goes before "Workspace", nor between it and "Add views" */
const dropsBeforeFixedTools = (event: DropEvent): boolean => {
    const target = event.kind === 'tab' && getTargetTabId(event.nativeEvent)
    if (!target || !isFixedToolPanelId(target)) {
        return false
    }
    return target === WORKSPACE_PANEL_ID || BEFORE_TAB.includes(event.position)
}

/* What the drop rules need to know about a drop, and the view being
 * dragged, if it is one (read once, as the handlers need both) */
export const getDropContext = (
    api: DockviewApi,
    event: DropEvent,
    tree: GridTree | null
): {
    context: DropContext
    draggedView: IDockviewPanel | undefined
    /* A settings tab dropped on the grid, for its view */
    standsInForView: boolean
} => {
    const data = event.getData()
    const dragged = getDraggedPanel(api, data)
    const targetIsEdgeGroup = isEdgeGroup(event.group)
    const standsInForView = Boolean(
        dragged &&
        !targetIsEdgeGroup &&
        isViewSettingsPanel(dragged) &&
        getPanelView(api, dragged)
    )
    const panel = standsInForView ? getPanelView(api, dragged) : dragged
    const source = standsInForView ? 'view' : getDragSource(data, panel)
    const sourceGroupId = source === 'view' ? panel?.group.id : undefined
    const context: DropContext = {
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
        /* Also for drags that start anyway: touch drags, which dockview
         * runs itself, and scripted ones */
        disturbsFixedTools:
            Boolean(dragged && isFixedToolPanelId(dragged.id)) ||
            dropsBeforeFixedTools(event),
    }
    return {
        context,
        draggedView: source === 'view' ? panel : undefined,
        standsInForView,
    }
}

/* The formats a drag carries; none for a touch drag */
export const getDragFormats = (
    event: DragEvent | PointerEvent
): readonly string[] | undefined =>
    'dataTransfer' in event ? event.dataTransfer?.types : undefined

/* A drag of the workspace's own: a palette tile, or a tab dockview drags
 * (its drag data is set by the time dragstart bubbles up). Other drags,
 * such as text moved within a note, leave the workspace alone. */
export const isWorkspaceDrag = (event: DragEvent): boolean =>
    Boolean(
        getDragFormats(event)?.includes(VIEW_DRAG_MIME) ||
        getDraggedTile() ||
        getPanelData()
    )

/* The view type a palette drag carries, if there is room for one more */
export const getAddableDraggedType = (
    api: DockviewApi,
    formats: readonly string[] | undefined
): ViewType | null => {
    const type = getDraggedViewType(formats) ?? getDraggedTile()
    return type && canAddView(type, getViewPanels(api).map(toWorkspaceView))
        ? type
        : null
}

/* A settings tab dragged onto the grid stands in for its view, as if the
 * view's own tab were dragged */
const getPanelView = (
    api: DockviewApi,
    panel: IDockviewPanel | undefined
): IDockviewPanel | undefined => {
    if (!panel) {
        return undefined
    }
    if (isViewSettingsPanel(panel)) {
        return api.getPanel(getSettingsViewId(panel))
    }
    return isViewPanel(panel) ? panel : undefined
}

/* The view being dragged by its tab (or its group's header, or its
 * settings tab), if any */
export const getDraggedView = (api: DockviewApi): IDockviewPanel | undefined =>
    getPanelView(api, getDraggedPanel(api, getPanelData()))

/* The sizes of what is dragged: a view by its tab (or its group's header),
 * or a palette tile while there is room for one more of its type. Null for
 * anything else, like a tool's tab. */
export const getDraggedSizes = (
    api: DockviewApi,
    tabDrag: DragData,
    formats: readonly string[] | undefined
): ViewSizes | null => {
    if (tabDrag) {
        const view = getPanelView(api, getDraggedPanel(api, tabDrag))
        return view ? getPanelSizes(view) : null
    }
    const type = getAddableDraggedType(api, formats)
    return type ? getViewTypeSizes(type) : null
}

/* "Workspace" and "Add views" stay first (see isAllowedDrop): a mouse drag
 * of one doesn't even start. It is cancelled before dockview's own
 * dragstart listener on the tab, as dockview readies a drag (its drag data,
 * iframes that ignore the pointer) before onWillDragPanel, and only a
 * dragend, which a cancelled drag never gets, would undo that. Registered
 * on the document in the capture phase, so it runs first. */
export const cancelFixedToolDrag = (event: Event): void => {
    const tab =
        event.target instanceof Element
            ? event.target.closest<HTMLElement>('.dv-tab')
            : null
    const panelId = tab?.dataset.tabPanelId
    if (panelId && isFixedToolPanelId(panelId)) {
        event.preventDefault()
    }
}

/* A touch drag, which dockview runs itself with pointer events, still
 * starts, but drops nowhere */
export const keepFixedToolsInPlace = (event: {
    panel: IDockviewPanel
    nativeEvent: Event
}): void => {
    if (isFixedToolPanelId(event.panel.id)) {
        event.nativeEvent.preventDefault()
    }
}
