import i18n from '@dhis2/d2-i18n'
import { decodeViewDrag, VIEW_DRAG_MIME } from '@modules/workspace/drag-payload'
import {
    canAddView,
    getEdgeDockLength,
    getNextViewNumber,
    getSplitAxis,
    hasRoomToDockAtEdge,
    hasRoomToSplitCell,
    isAllowedDrop,
    isSwapDrop,
    VIEW_MIN_SIZE,
    type DropContext,
    type DragSource,
    type SplitAxis,
} from '@modules/workspace/rules'
import { getViewTitle, type ViewType } from '@modules/workspace/view-types'
import type { AppDispatch } from '@store/store'
import {
    activeViewChanged,
    viewAdded,
    viewRemoved,
    type WorkspaceView,
} from '@store/workspace-slice'
import {
    positionToDirection,
    type AddPanelPositionOptions,
    type DockviewApi,
    type DockviewGroupPanel,
    type IDockviewPanel,
    type Position,
} from 'dockview-react'

export const VIEW_COMPONENT = 'view'
export const VIEW_SETTINGS_COMPONENT = 'view-settings'
export const SWAP_SPACER_COMPONENT = 'swap-spacer'
export const ADD_VIEWS_PANEL_ID = 'add-views'
export const INTERACTIONS_PANEL_ID = 'interactions'
const TOOL_PANEL_IDS = [ADD_VIEWS_PANEL_ID, INTERACTIONS_PANEL_ID]
const SETTINGS_PANEL_PREFIX = 'settings-'

const getSettingsPanelId = (viewId: string): string =>
    `${SETTINGS_PANEL_PREFIX}${viewId}`

const isToolPanelId = (id: string): boolean =>
    TOOL_PANEL_IDS.includes(id) || id.startsWith(SETTINGS_PANEL_PREFIX)

export type EdgePosition = 'top' | 'bottom' | 'left' | 'right'
export const EDGE_POSITIONS: EdgePosition[] = ['top', 'left', 'right', 'bottom']

const EDGE_GROUP_SIZE: Record<EdgePosition, number> = {
    top: 132,
    bottom: 132,
    left: 280,
    right: 280,
}

export type ViewPanelParams = Pick<WorkspaceView, 'type' | 'number'>
export type ViewSettingsPanelParams = { viewId: string }

const isViewPanel = (panel: IDockviewPanel): boolean =>
    panel.api.component === VIEW_COMPONENT

const isEdgeGroup = (group: DockviewGroupPanel | undefined): boolean =>
    group?.api.location.type === 'edge'

export const getEdgePosition = (
    group: DockviewGroupPanel
): EdgePosition | null => {
    const location = group.api.location
    return location.type === 'edge' ? location.position : null
}

const getViewPanels = (api: DockviewApi): IDockviewPanel[] =>
    api.panels.filter(isViewPanel)

const toWorkspaceView = (panel: IDockviewPanel): WorkspaceView => {
    const params = panel.params as ViewPanelParams
    return { id: panel.id, type: params.type, number: params.number }
}

const getDropPlacement = (
    group: DockviewGroupPanel | undefined,
    position: Position
): AddPanelPositionOptions => {
    const direction = positionToDirection(position)
    return group && !isEdgeGroup(group)
        ? { referenceGroup: group, direction }
        : { direction: direction === 'within' ? 'right' : direction }
}

const getViewGroups = (api: DockviewApi): DockviewGroupPanel[] => [
    ...new Set(getViewPanels(api).map((panel) => panel.group)),
]

const getCellLength = (group: DockviewGroupPanel, axis: SplitAxis): number =>
    axis === 'horizontal' ? group.api.width : group.api.height

/* Docking at the outer edge adds a whole column (or row); the columns are
 * told apart by where their cells start. */
const hasRoomAtGridEdge = (api: DockviewApi, axis: SplitAxis): boolean => {
    const groups = getViewGroups(api)
    if (!groups.length) {
        return true
    }
    const starts = groups.map((group) => {
        const rect = group.element.getBoundingClientRect()
        return Math.round(axis === 'horizontal' ? rect.left : rect.top)
    })
    const narrowest = Math.min(
        ...groups.map((group) => getCellLength(group, axis))
    )
    return hasRoomToDockAtEdge(narrowest, new Set(starts).size, axis)
}

const hasRoomForDrop = (
    api: DockviewApi,
    group: DockviewGroupPanel | undefined,
    position: Position
): boolean => {
    const axis = getSplitAxis(position)
    if (!axis) {
        return true
    }
    return group && !isEdgeGroup(group)
        ? hasRoomToSplitCell(getCellLength(group, axis), axis)
        : hasRoomAtGridEdge(api, axis)
}

/* A click adds the view next to the selected one (or the last one), to its
 * right or else below it, in the first cell with room for a split. The
 * tools strip takes focus when its tile is clicked, so the selected view
 * comes from the caller. Returns null when no cell has room. */
const getDefaultPlacement = (
    api: DockviewApi,
    nextToViewId: string | null
): AddPanelPositionOptions | null => {
    const groups = getViewGroups(api)
    if (!groups.length) {
        return { direction: 'right' }
    }
    const preferred =
        (nextToViewId && api.getPanel(nextToViewId)?.group) || groups.at(-1)
    const candidates = [
        preferred,
        ...groups
            .filter((group) => group !== preferred)
            .sort(
                (a, b) =>
                    b.api.width * b.api.height - a.api.width * a.api.height
            ),
    ].filter((group): group is DockviewGroupPanel => Boolean(group))

    for (const group of candidates) {
        if (hasRoomToSplitCell(group.api.width, 'horizontal')) {
            return { referenceGroup: group, direction: 'right' }
        }
        if (hasRoomToSplitCell(group.api.height, 'vertical')) {
            return { referenceGroup: group, direction: 'below' }
        }
    }
    return null
}

export type AddViewResult =
    | { status: 'added'; viewId: string }
    | { status: 'full' }
    | { status: 'no-room' }

/* After a view docks at an outer edge, every line of the grid along that
 * axis that holds a single view (the docked one included) gets 1/n of the
 * grid, n being the number of views; a line of stacked views keeps the
 * rest. A line is a cell spanning the whole grid across the axis. Resizing
 * in order along the axis lets each step settle before the next. */
const sizeEdgeDockedView = (
    api: DockviewApi,
    viewId: string,
    axis: SplitAxis
): void => {
    const groups = getViewGroups(api)
    if (!api.getPanel(viewId) || groups.length < 2) {
        return
    }
    const rectOf = (group: DockviewGroupPanel) =>
        group.element.getBoundingClientRect()
    const rects = groups.map(rectOf)
    const [start, end, crossStart, crossEnd]: Array<keyof DOMRect> =
        axis === 'horizontal'
            ? ['left', 'right', 'top', 'bottom']
            : ['top', 'bottom', 'left', 'right']
    const extent = (from: keyof DOMRect, to: keyof DOMRect) =>
        Math.max(...rects.map((rect) => rect[to] as number)) -
        Math.min(...rects.map((rect) => rect[from] as number))
    const gridLength = extent(start, end)
    const gridCross = extent(crossStart, crossEnd)
    if (gridLength <= 0 || gridCross <= 0) {
        return
    }
    const length = getEdgeDockLength(gridLength, groups.length)

    const lines = groups
        .filter((group) => {
            const rect = rectOf(group)
            return (
                (rect[crossEnd] as number) - (rect[crossStart] as number) >=
                gridCross - 1
            )
        })
        .sort(
            (a, b) =>
                (rectOf(a)[start] as number) - (rectOf(b)[start] as number)
        )

    for (const line of lines) {
        line.api.setSize(
            axis === 'horizontal' ? { width: length } : { height: length }
        )
    }
}

export const addView = (
    api: DockviewApi,
    type: ViewType,
    {
        placement,
        nextToViewId = null,
    }: {
        placement?: AddPanelPositionOptions
        nextToViewId?: string | null
    } = {}
): AddViewResult => {
    const views = getViewPanels(api).map(toWorkspaceView)
    if (!canAddView(views.length)) {
        return { status: 'full' }
    }
    const position = placement ?? getDefaultPlacement(api, nextToViewId)
    if (!position) {
        return { status: 'no-room' }
    }
    const number = getNextViewNumber(type, views)
    const params: ViewPanelParams = { type, number }
    const viewId = `${type}-${crypto.randomUUID()}`
    api.addPanel({
        id: viewId,
        component: VIEW_COMPONENT,
        title: getViewTitle(type, number),
        params,
        renderer: 'always',
        position,
        minimumWidth: VIEW_MIN_SIZE.width,
        minimumHeight: VIEW_MIN_SIZE.height,
    })
    return { status: 'added', viewId }
}

/* Swaps two views by moving the panels themselves, so their content (and
 * later a plugin's iframe) is never rebuilt. dockview removes a group the
 * moment it is empty, so each cell holds a temporary spacer tab while its
 * view is away. */
export const swapViews = (
    api: DockviewApi,
    first: IDockviewPanel,
    second: IDockviewPanel
): void => {
    const firstGroup = first.group
    const secondGroup = second.group
    if (firstGroup === secondGroup) {
        return
    }
    const spacers = [firstGroup, secondGroup].map((group, index) =>
        api.addPanel({
            id: `swap-spacer-${index}-${crypto.randomUUID()}`,
            component: SWAP_SPACER_COMPONENT,
            position: { referenceGroup: group },
            inactive: true,
        })
    )
    first.api.moveTo({ group: secondGroup })
    second.api.moveTo({ group: firstGroup })
    spacers.forEach((spacer) => api.removePanel(spacer))
    first.api.setActive()
    showViewSettings(api, first.id)
}

export const getSwapTargets = (
    api: DockviewApi,
    viewId: string
): IDockviewPanel[] => getViewPanels(api).filter((panel) => panel.id !== viewId)

/* Brings a view's settings tab forward without making the tools strip the
 * active group or expanding it when collapsed. */
const showToolPanel = (api: DockviewApi, panelId: string): void => {
    const panel = api.getPanel(panelId)
    panel?.group.model.openPanel(panel, { skipSetGroupActive: true })
}

const showViewSettings = (api: DockviewApi, viewId: string): void =>
    showToolPanel(api, getSettingsPanelId(viewId))

const VIEW_ID_ATTRIBUTE = 'data-view-id'

/* Clicking a view that is already active fires no dockview event, so
 * pointer-downs in a view's cell also bring its settings forward. A cell's
 * body is rendered in an overlay outside the group element, so it carries
 * the view id itself; tabs sit inside the group element. */
export const showSettingsForTarget = (
    api: DockviewApi,
    target: EventTarget | null
): void => {
    if (!(target instanceof Element)) {
        return
    }
    const bodyViewId = target
        .closest(`[${VIEW_ID_ATTRIBUTE}]`)
        ?.getAttribute(VIEW_ID_ATTRIBUTE)
    const tabViewId = getViewGroups(api).find((group) =>
        group.element.contains(target)
    )?.activePanel?.id
    const viewId = bodyViewId ?? tabViewId
    if (viewId) {
        showViewSettings(api, viewId)
    }
}

/* Screen-reader announcements: only changes the user made to views are
 * spoken, translated. Tool and settings tabs open and close on their own,
 * and swap spacers are internal. */
export const getWorkspaceAnnouncement = (event: {
    kind: string
    panel: IDockviewPanel
}): string | null => {
    if (!isViewPanel(event.panel)) {
        return null
    }
    const title = event.panel.title ?? ''
    const interpolation = { escapeValue: false }
    switch (event.kind) {
        case 'open':
            return i18n.t('{{title}} added', { title, interpolation })
        case 'close':
            return i18n.t('{{title}} closed', { title, interpolation })
        case 'maximize':
            return i18n.t('{{title}} maximized', { title, interpolation })
        case 'restore':
            return i18n.t('{{title}} restored', { title, interpolation })
        default:
            return null
    }
}

export const openSettings = (api: DockviewApi, viewId: string): void => {
    const settings = api.getPanel(getSettingsPanelId(viewId))
    settings?.group.api.expand()
    settings?.api.setActive()
}

/* getGroup is typed with the group interface, but moveTo needs the group
 * class; the returned object is that class at runtime. */
const getGroupPanel = (
    api: DockviewApi,
    id: string
): DockviewGroupPanel | undefined =>
    api.getGroup(id) as DockviewGroupPanel | undefined

const getOrAddEdgeGroupId = (
    api: DockviewApi,
    position: EdgePosition
): string =>
    (
        api.getEdgeGroup(position) ??
        api.addEdgeGroup(position, {
            id: `tools-${position}`,
            initialSize: EDGE_GROUP_SIZE[position],
            minimumSize: 80,
        })
    ).id

export const moveTools = (
    api: DockviewApi,
    from: EdgePosition,
    to: EdgePosition
): void => {
    const source = api.getEdgeGroup(from)
    const sourceGroup = source && getGroupPanel(api, source.id)
    if (!sourceGroup || from === to) {
        return
    }
    const target = getGroupPanel(api, getOrAddEdgeGroupId(api, to))
    if (!target) {
        return
    }
    const activePanel = sourceGroup.activePanel
    const wasCollapsed = source.isCollapsed()
    for (const panel of [...sourceGroup.panels]) {
        panel.api.moveTo({ group: target })
    }
    api.removeEdgeGroup(from)
    activePanel?.api.setActive()
    if (wasCollapsed) {
        target.api.collapse()
    }
}

const getDragSource = (panelId: string | null | undefined): DragSource => {
    if (!panelId) {
        return 'external'
    }
    return isToolPanelId(panelId) ? 'tool' : 'view'
}

const getDropContext = (
    api: DockviewApi,
    event: {
        kind: DropContext['kind']
        position: Position
        group?: DockviewGroupPanel
        getData: () => { panelId: string | null } | undefined
    }
): DropContext => {
    const panelId = event.getData()?.panelId
    return {
        kind: event.kind,
        position: event.position,
        targetIsEdgeGroup: isEdgeGroup(event.group),
        targetHoldsSource: Boolean(
            panelId && event.group?.panels.some(({ id }) => id === panelId)
        ),
        source: getDragSource(panelId),
        gridIsEmpty: getViewPanels(api).length === 0,
    }
}

const hasViewPayload = (event: DragEvent | PointerEvent): boolean =>
    'dataTransfer' in event &&
    Boolean(event.dataTransfer?.types.includes(VIEW_DRAG_MIME))

type ToolTitles = {
    addViews: string
    interactions: string
    viewSettings: (viewTitle: string) => string
}

const addToolPanels = (api: DockviewApi, titles: ToolTitles): void => {
    if (api.getPanel(ADD_VIEWS_PANEL_ID)) {
        return
    }
    const topGroupId = getOrAddEdgeGroupId(api, 'top')
    api.addPanel({
        id: ADD_VIEWS_PANEL_ID,
        component: ADD_VIEWS_PANEL_ID,
        title: titles.addViews,
        position: { referenceGroup: topGroupId },
    })
    api.addPanel({
        id: INTERACTIONS_PANEL_ID,
        component: INTERACTIONS_PANEL_ID,
        title: titles.interactions,
        position: { referenceGroup: topGroupId },
        inactive: true,
    })
}

/* Settings tabs sit between "Add views" and "Interactions", in the
 * order the views were added. */
const addViewSettingsPanel = (
    api: DockviewApi,
    view: IDockviewPanel,
    titles: ToolTitles
): void => {
    const id = getSettingsPanelId(view.id)
    const interactions = api.getPanel(INTERACTIONS_PANEL_ID)
    if (api.getPanel(id) || !interactions) {
        return
    }
    const params: ViewSettingsPanelParams = { viewId: view.id }
    api.addPanel({
        id,
        component: VIEW_SETTINGS_COMPONENT,
        title: titles.viewSettings(view.title ?? ''),
        params,
        position: {
            referenceGroup: interactions.group,
            index: interactions.group.panels.indexOf(interactions),
        },
        inactive: true,
    })
}

/* Wires the dockview instance to the store and the drop rules. Returns a
 * cleanup that disposes every listener, so a remount (e.g. StrictMode)
 * starts clean. */
export const setupWorkspace = (
    api: DockviewApi,
    dispatch: AppDispatch,
    toolTitles: ToolTitles
): (() => void) => {
    addToolPanels(api, toolTitles)
    let selectedViewId: string | null = null
    /* Set by an outer-edge drop, consumed once the view has landed */
    let pendingEdgeAxis: SplitAxis | null = null

    /* Closing the selected view selects a neighbour, like closing an editor
     * in VS Code; the strip then shows that view's settings, or the palette
     * once the grid is empty, instead of whichever tab dockview falls back to. */
    const onViewRemoved = (viewId: string, settingsWasShown: boolean) => {
        if (selectedViewId === viewId) {
            selectedViewId = null
            const next = getViewPanels(api)[0]
            if (next) {
                next.api.setActive()
            }
        }
        if (settingsWasShown || selectedViewId === null) {
            if (selectedViewId) {
                showViewSettings(api, selectedViewId)
            } else {
                showToolPanel(api, ADD_VIEWS_PANEL_ID)
            }
        }
    }

    const disposables = [
        api.onDidAddPanel((panel) => {
            if (isViewPanel(panel)) {
                dispatch(viewAdded(toWorkspaceView(panel)))
                addViewSettingsPanel(api, panel, toolTitles)
            }
        }),
        api.onDidRemovePanel((panel) => {
            if (!isViewPanel(panel)) {
                return
            }
            dispatch(viewRemoved(panel.id))
            const settings = api.getPanel(getSettingsPanelId(panel.id))
            const settingsWasShown =
                settings?.group.activePanel?.id === settings?.id
            if (settings) {
                api.removePanel(settings)
            }
            onViewRemoved(panel.id, settingsWasShown)
        }),
        api.onDidActivePanelChange(({ panel, origin }) => {
            if (!panel || !isViewPanel(panel)) {
                return
            }
            selectedViewId = panel.id
            dispatch(activeViewChanged(panel.id))
            /* Only a view the user picks shows its settings; one just added
             * from the palette leaves the palette open for the next add. */
            if (origin === 'user') {
                showViewSettings(api, panel.id)
            }
        }),
        api.onDidMovePanel(({ panel }) => {
            const axis = pendingEdgeAxis
            pendingEdgeAxis = null
            if (axis && isViewPanel(panel)) {
                sizeEdgeDockedView(api, panel.id, axis)
            }
        }),
        api.onUnhandledDragOver((event) => {
            if (
                hasViewPayload(event.nativeEvent) &&
                canAddView(getViewPanels(api).length)
            ) {
                event.accept()
            }
        }),
        api.onWillShowOverlay((event) => {
            const allowed = isAllowedDrop(getDropContext(api, event))
            if (!allowed || !hasRoomForDrop(api, event.group, event.position)) {
                event.preventDefault()
            }
        }),
        api.onWillDrop((event) => {
            const context = getDropContext(api, event)
            pendingEdgeAxis =
                context.kind === 'edge' ? getSplitAxis(event.position) : null
            if (!isSwapDrop(context)) {
                return
            }
            event.preventDefault()
            const dragged = api.getPanel(event.getData()?.panelId ?? '')
            const target = event.group?.activePanel
            if (dragged && target) {
                swapViews(api, dragged, target)
            }
        }),
        api.onDidDrop((event) => {
            const native = event.nativeEvent
            const raw =
                'dataTransfer' in native
                    ? native.dataTransfer?.getData(VIEW_DRAG_MIME)
                    : undefined
            const type = decodeViewDrag(raw)
            const axis = pendingEdgeAxis
            pendingEdgeAxis = null
            if (!type) {
                return
            }
            const result = addView(api, type, {
                placement: getDropPlacement(event.group, event.position),
            })
            if (result.status === 'added' && axis) {
                sizeEdgeDockedView(api, result.viewId, axis)
            }
        }),
    ]

    return () => disposables.forEach((disposable) => disposable.dispose())
}
