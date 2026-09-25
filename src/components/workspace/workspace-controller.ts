import i18n from '@dhis2/d2-i18n'
import { decodeViewDrag, VIEW_DRAG_MIME } from '@modules/workspace/drag-payload'
import {
    fromSerializedGrid,
    getGridLength,
    getMinLength,
    VIEW_MIN_SIZE,
    type GridTree,
    type Rect,
    type SerializedGrid,
    type SplitAxis,
} from '@modules/workspace/grid-tree'
import {
    getInsertZones,
    type InsertZone,
} from '@modules/workspace/insert-zones'
import {
    computeLayoutSizes,
    type LayoutChange,
    type SizeRequest,
} from '@modules/workspace/layout-sizing'
import {
    canAddView,
    getNextViewNumber,
    getSplitAxis,
    hasRoomToInsertLine,
    hasRoomToSplitCell,
    isAllowedDrop,
    isNoOpMove,
    isSwapDrop,
    type DropContext,
    type DragSource,
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
    getPanelData,
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
    return tree.width > 0 && tree.height > 0 ? tree : null
}

/* The dragged view is left out of the room checks: moving it frees its
 * space. */
const hasRoomForDrop = (
    tree: GridTree | null,
    {
        group,
        position,
        sourceGroupId,
    }: {
        group: DockviewGroupPanel | undefined
        position: Position
        sourceGroupId: string | null
    }
): boolean => {
    const axis = getSplitAxis(position)
    if (!axis) {
        return true
    }
    if (group && !isEdgeGroup(group)) {
        return hasRoomToSplitCell(getCellLength(group, axis), axis)
    }
    return (
        !tree ||
        hasRoomToInsertLine({
            minLength: getMinLength(tree.root, tree.orientation, {
                axis,
                excludeId: sourceGroupId,
            }),
            length: getGridLength(tree, axis),
            axis,
        })
    )
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

/* A layout change about to happen, and the layout before it, so that
 * sizes can be put back in proportion once dockview has made it (see
 * setupWorkspace). A tab dropped at the outer edge reshapes the grid
 * before dockview announces the change, so the layout is read when the
 * change is expected. Kept by view id: a moved view may land in a new
 * cell. Kept until the current task ends, as a move to the outer edge
 * reaches dockview as two changes (a new cell, then the view moving in),
 * and sizes are fixed after each. */
type ExpectedChange =
    | { kind: 'split'; viewId: string; targetGroupId: string }
    | { kind: 'insert'; viewId: string }

const expectedChanges = new WeakMap<
    DockviewApi,
    { change: ExpectedChange; before: GridTree | null }
>()

const expectLayoutChange = (api: DockviewApi, change: ExpectedChange): void => {
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
        nextToViewId = null,
        sizing,
    }: {
        placement?: AddPanelPositionOptions
        nextToViewId?: string | null
        /* A split halves the reference cell; an insert adds a new line.
         * Defaults to a split when there is a reference cell. */
        sizing?: 'split' | 'insert'
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
    const targetGroupId = getReferenceGroupId(position)
    expectLayoutChange(
        api,
        targetGroupId && sizing !== 'insert'
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

/* For callers that only know the ids (e.g. from the store); does nothing
 * if either view is gone by then. */
export const swapViewsById = (
    api: DockviewApi,
    firstId: string,
    secondId: string
): void => {
    const first = api.getPanel(firstId)
    const second = api.getPanel(secondId)
    if (first && second) {
        swapViews(api, first, second)
    }
}

/* Swap spacers are added and removed within one call, so they never paint */
export const SwapSpacer = (): null => null

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
    getData: () => DragData
}

const getDropContext = (
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

const hasViewPayload = (event: DragEvent | PointerEvent): boolean =>
    'dataTransfer' in event &&
    Boolean(event.dataTransfer?.types.includes(VIEW_DRAG_MIME))

/* The gridview's top-left corner in the page, where its first cell starts */
const getGridOrigin = (api: DockviewApi): { left: number; top: number } => {
    const rects = getViewGroups(api).map((group) =>
        group.element.getBoundingClientRect()
    )
    return {
        left: Math.min(...rects.map((rect) => rect.left)),
        top: Math.min(...rects.map((rect) => rect.top)),
    }
}

/* The view being dragged by its tab (or its group's header), if any */
const getDraggedView = (api: DockviewApi): IDockviewPanel | undefined => {
    const panel = getDraggedPanel(api, getPanelData())
    return panel && isViewPanel(panel) ? panel : undefined
}

/* The strips between lines where the current drag can insert a view,
 * placed relative to the container element. None for a tool tab or for a
 * palette tile once the grid is full. */
export const getInsertZonesForDrag = (
    api: DockviewApi,
    container: Element
): InsertZone[] => {
    const isTabDrag = Boolean(getPanelData())
    const view = getDraggedView(api)
    const canDrag = isTabDrag
        ? Boolean(view)
        : canAddView(getViewPanels(api).length)
    const tree = canDrag ? readGridTree(api) : null
    if (!tree) {
        return []
    }
    const origin = getGridOrigin(api)
    const bounds = container.getBoundingClientRect()
    const toContainer = (rect: Rect): Rect => ({
        ...rect,
        left: rect.left + origin.left - bounds.left,
        top: rect.top + origin.top - bounds.top,
    })
    return getInsertZones(tree, { sourceId: view?.group.id ?? null }).map(
        (zone) => ({ ...zone, rect: toContainer(zone.rect) })
    )
}

export const canDropOnInsertZone = (
    api: DockviewApi,
    dataTransfer: DataTransfer | null
): boolean =>
    getPanelData()
        ? Boolean(getDraggedView(api))
        : Boolean(dataTransfer?.types.includes(VIEW_DRAG_MIME)) &&
          canAddView(getViewPanels(api).length)

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
    const type = decodeViewDrag(dataTransfer?.getData(VIEW_DRAG_MIME))
    if (type) {
        addView(api, type, {
            placement: reference
                ? { referenceGroup: reference, direction }
                : { direction },
            sizing: 'insert',
        })
    }
}

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
    /* The layout as the user last left it, read before each change while
     * no view is maximized, so leaving maximize puts it back */
    let layoutBefore: GridTree | null = null

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
            const settingsWasShown = Boolean(
                settings && settings.group.activePanel?.id === settings.id
            )
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
        api.onWillMutateLayout(() => {
            layoutBefore = readGridTree(api) ?? layoutBefore
        }),
        /* dockview spreads space evenly whenever the grid changes; this
         * puts the sizes back in proportion with the user's layout */
        api.onDidMutateLayout(() => {
            const expected = expectedChanges.get(api)
            const before = expected?.before ?? layoutBefore
            const after = readGridTree(api)
            if (!before || !after) {
                return
            }
            const change = expected && toLayoutChange(api, expected.change)
            applySizeRequests(api, computeLayoutSizes(before, after, change))
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
            const tree = readGridTree(api)
            const context = getDropContext(api, event, tree)
            const sourceGroupId =
                context.source === 'view'
                    ? (getDraggedPanel(api, event.getData())?.group.id ?? null)
                    : null
            const hasRoom = hasRoomForDrop(tree, {
                group: event.group,
                position: event.position,
                sourceGroupId,
            })
            if (!isAllowedDrop(context) || !hasRoom) {
                event.preventDefault()
            }
        }),
        api.onWillDrop((event) => {
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
        }),
        api.onDidDrop((event) => {
            const native = event.nativeEvent
            const raw =
                'dataTransfer' in native
                    ? native.dataTransfer?.getData(VIEW_DRAG_MIME)
                    : undefined
            const type = decodeViewDrag(raw)
            if (type) {
                addView(api, type, {
                    placement: getDropPlacement(event.group, event.position),
                })
            }
        }),
    ]

    return () => disposables.forEach((disposable) => disposable.dispose())
}
