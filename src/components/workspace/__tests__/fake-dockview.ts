import type {
    DockviewApi,
    DockviewGroupPanel,
    IDockviewPanel,
} from 'dockview-react'
import { vi, type Mock } from 'vitest'

/* An in-memory stand-in for the parts of the dockview api the workspace
 * controller uses. jsdom has no layout, so the real dockview cannot
 * exercise size- and position-dependent code; here tests set each cell's
 * size and position themselves. */

type Rect = { left: number; top: number; width: number; height: number }
type Location =
    | { type: 'grid' }
    | { type: 'edge'; position: 'top' | 'bottom' | 'left' | 'right' }

export type FakePanel = {
    id: string
    title?: string
    params?: unknown
    group: FakeGroup
    api: {
        component: string
        setActive: Mock<() => void>
        moveTo: Mock<(options: { group: FakeGroup }) => void>
    }
}

export type FakeGroup = {
    id: string
    panels: FakePanel[]
    activePanel?: FakePanel
    element: {
        getBoundingClientRect: () => DOMRect
        contains: (node: unknown) => boolean
    }
    model: { openPanel: Mock<(panel: FakePanel) => void> }
    api: {
        id: string
        location: Location
        width: number
        height: number
        isCollapsed: () => boolean
        collapse: Mock<() => void>
        expand: Mock<() => void>
        setSize: Mock<(size: { width?: number; height?: number }) => void>
    }
}

const toDomRect = ({ left, top, width, height }: Rect): DOMRect =>
    ({
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        x: left,
        y: top,
    }) as DOMRect

type EventName =
    | 'onDidAddPanel'
    | 'onDidRemovePanel'
    | 'onDidActivePanelChange'
    | 'onDidMovePanel'
    | 'onUnhandledDragOver'
    | 'onWillShowOverlay'
    | 'onWillDrop'
    | 'onDidDrop'

export const createFakeDockview = () => {
    const listeners = new Map<EventName, Set<(event: unknown) => void>>()
    const panels: FakePanel[] = []
    const groups: FakeGroup[] = []
    const edgeGroups = new Map<string, FakeGroup>()
    let groupCount = 0

    const emit = (name: EventName, event: unknown) =>
        listeners.get(name)?.forEach((listener) => listener(event))

    const on = (name: EventName) => (listener: (event: unknown) => void) => {
        if (!listeners.has(name)) {
            listeners.set(name, new Set())
        }
        listeners.get(name)?.add(listener)
        return { dispose: () => listeners.get(name)?.delete(listener) }
    }

    const createGroup = (
        location: Location,
        rect: Rect = { left: 0, top: 0, width: 0, height: 0 },
        id = `group-${++groupCount}`
    ): FakeGroup => {
        let collapsed = false
        const group: FakeGroup = {
            id,
            panels: [],
            element: {
                getBoundingClientRect: () => toDomRect(rect),
                contains: () => false,
            },
            model: {
                openPanel: vi.fn((panel: FakePanel) => {
                    group.activePanel = panel
                }),
            },
            api: {
                id,
                location,
                width: rect.width,
                height: rect.height,
                isCollapsed: () => collapsed,
                collapse: vi.fn(() => {
                    collapsed = true
                }),
                expand: vi.fn(() => {
                    collapsed = false
                }),
                setSize: vi.fn(),
            },
        }
        groups.push(group)
        return group
    }

    const placePanel = (panel: FakePanel, group: FakeGroup, index?: number) => {
        panel.group.panels = panel.group.panels.filter((p) => p !== panel)
        panel.group = group
        group.panels.splice(index ?? group.panels.length, 0, panel)
    }

    const createPanel = ({
        id,
        component,
        group,
        title,
        params,
        index,
    }: {
        id: string
        component: string
        group: FakeGroup
        title?: string
        params?: unknown
        index?: number
    }): FakePanel => {
        const panel: FakePanel = {
            id,
            title,
            params,
            group,
            api: {
                component,
                /* Like dockview, activating from code reports origin 'api' */
                setActive: vi.fn(() => {
                    api.activePanel = panel
                    panel.group.activePanel = panel
                    emit('onDidActivePanelChange', { panel, origin: 'api' })
                }),
                moveTo: vi.fn(({ group: target }: { group: FakeGroup }) =>
                    placePanel(panel, target)
                ),
            },
        }
        group.panels.splice(index ?? group.panels.length, 0, panel)
        panels.push(panel)
        return panel
    }

    const findGroup = (reference: unknown): FakeGroup | undefined =>
        typeof reference === 'string'
            ? groups.find((group) => group.id === reference)
            : (reference as FakeGroup | undefined)

    const api = {
        activePanel: undefined as FakePanel | undefined,
        get panels() {
            return panels
        },
        getPanel: (id: string) => panels.find((panel) => panel.id === id),
        getGroup: (id: string) => groups.find((group) => group.id === id),
        addPanel: vi.fn(
            (options: {
                id: string
                component: string
                title?: string
                params?: unknown
                inactive?: boolean
                position?: { referenceGroup?: unknown; index?: number }
            }) => {
                const group =
                    findGroup(options.position?.referenceGroup) ??
                    createGroup({ type: 'grid' })
                const panel = createPanel({
                    id: options.id,
                    component: options.component,
                    group,
                    title: options.title,
                    params: options.params,
                    index: options.position?.index,
                })
                emit('onDidAddPanel', panel)
                if (!options.inactive) {
                    panel.api.setActive()
                }
                return panel
            }
        ),
        removePanel: vi.fn((panel: FakePanel) => {
            panels.splice(panels.indexOf(panel), 1)
            panel.group.panels = panel.group.panels.filter((p) => p !== panel)
            if (panel.group.activePanel === panel) {
                panel.group.activePanel = panel.group.panels[0]
            }
            emit('onDidRemovePanel', panel)
        }),
        getEdgeGroup: (position: string) => edgeGroups.get(position)?.api,
        addEdgeGroup: vi.fn(
            (
                position: 'top' | 'bottom' | 'left' | 'right',
                options: { id: string }
            ) => {
                const group = createGroup(
                    { type: 'edge', position },
                    undefined,
                    options.id
                )
                edgeGroups.set(position, group)
                return group.api
            }
        ),
        removeEdgeGroup: vi.fn((position: string) => {
            edgeGroups.delete(position)
        }),
        onDidAddPanel: on('onDidAddPanel'),
        onDidRemovePanel: on('onDidRemovePanel'),
        onDidActivePanelChange: on('onDidActivePanelChange'),
        onDidMovePanel: on('onDidMovePanel'),
        onUnhandledDragOver: on('onUnhandledDragOver'),
        onWillShowOverlay: on('onWillShowOverlay'),
        onWillDrop: on('onWillDrop'),
        onDidDrop: on('onDidDrop'),
    }

    /* A view already laid out in its own grid cell, without firing events */
    const addLaidOutView = (
        id: string,
        rect: Rect,
        { type = 'map', number = 1 }: { type?: string; number?: number } = {}
    ): FakePanel => {
        const group = createGroup({ type: 'grid' }, rect)
        const panel = createPanel({
            id,
            component: 'view',
            group,
            title: `${type} ${number}`,
            params: { type, number },
        })
        group.activePanel = panel
        return panel
    }

    return {
        api,
        asApi: api as unknown as DockviewApi,
        emit,
        groups,
        edgeGroups,
        createGroup,
        addLaidOutView,
        listenerCount: () =>
            [...listeners.values()].reduce((sum, set) => sum + set.size, 0),
    }
}

export const asGroup = (group: FakeGroup) =>
    group as unknown as DockviewGroupPanel

export const asPanel = (panel: FakePanel) => panel as unknown as IDockviewPanel
