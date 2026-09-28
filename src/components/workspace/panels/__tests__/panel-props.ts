import type { DockviewApi, IDockviewPanelProps } from 'dockview-react'
import { vi } from 'vitest'

type Listener = () => void

const createListeners = () => {
    const listeners = new Set<Listener>()
    return {
        subscribe: (listener: Listener) => {
            listeners.add(listener)
            return { dispose: () => listeners.delete(listener) }
        },
        emit: () => listeners.forEach((listener) => listener()),
    }
}

/* A group that can be collapsed, as the tools strip's */
export const createFakeGroup = (collapsed = false) => {
    let isCollapsed = collapsed
    const changes = createListeners()
    return {
        api: {
            isCollapsed: () => isCollapsed,
            onDidCollapsedChange: changes.subscribe,
        },
        setCollapsed: (value: boolean) => {
            isCollapsed = value
            changes.emit()
        },
    }
}

/* A panel as dockview renders it, in a group that can collapse and
 * change */
export const createFakePanel = <T extends object>(params: T, id = 'map-a') => {
    const groupChanges = createListeners()
    let maximized = false
    const api = {
        id,
        setActive: vi.fn(),
        updateParameters: vi.fn(),
        /* The body of a text row at its preferred size */
        width: 320,
        height: 85,
        isMaximized: vi.fn(() => maximized),
        maximize: vi.fn(() => {
            maximized = true
        }),
        exitMaximized: vi.fn(() => {
            maximized = false
        }),
        group: createFakeGroup(),
        onDidGroupChange: groupChanges.subscribe,
    }
    const props = {
        params,
        api,
        containerApi: {} as DockviewApi,
    } as unknown as IDockviewPanelProps<T>
    return {
        props,
        group: () => api.group,
        moveToGroup: (group: ReturnType<typeof createFakeGroup>) => {
            api.group = group
            groupChanges.emit()
        },
    }
}

export const panelProps = <T extends object>(params: T, id = 'map-a') =>
    createFakePanel(params, id).props
