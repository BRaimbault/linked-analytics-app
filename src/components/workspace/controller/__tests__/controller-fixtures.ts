import {
    createFakeDockview,
    type FakeGroup,
} from '@components/workspace/__tests__/fake-dockview'
import { setupWorkspace } from '@components/workspace/controller/setup-workspace'
import {
    getViewTypeMime,
    VIEW_DRAG_MIME,
} from '@modules/workspace/drag-payload'
import type { ViewType } from '@modules/workspace/view-types'
import { vi } from 'vitest'

export const titles = {
    addViews: 'Add views',
    viewSettings: (title: string) => `${title} settings`,
}

export const setup = () => {
    const fake = createFakeDockview()
    const dispatch = vi.fn()
    const cleanup = setupWorkspace(fake.asApi, dispatch, titles)
    const toolGroup = fake.edgeGroups.get('top') as FakeGroup
    return { ...fake, dispatch, cleanup, toolGroup }
}

/* A map view added through dockview, so its events fire */
export const addMapPanel = (
    fake: ReturnType<typeof createFakeDockview>,
    id: string
) =>
    fake.api.addPanel({
        id,
        component: 'view',
        title: id,
        params: { type: 'map', number: 1 },
    })

/* Two side-by-side 500x800 views, laid out without firing events */
export const twoColumns = (fake: ReturnType<typeof createFakeDockview>) => [
    fake.addLaidOutView('map-a', { left: 0, top: 0, width: 500, height: 800 }),
    fake.addLaidOutView(
        'vis-a',
        { left: 500, top: 0, width: 500, height: 800 },
        { type: 'visualization' }
    ),
]

export const existing = (
    fake: ReturnType<typeof createFakeDockview>,
    id: string
) => {
    const panel = fake.api.getPanel(id)
    if (!panel) {
        throw new Error(`No panel ${id}`)
    }
    return panel
}

/* The cell of the view dockview is adding, once it exists */
export const newViewGroupId = (fake: ReturnType<typeof createFakeDockview>) =>
    fake.api.panels.filter((panel) => panel.api.component === 'view').at(-1)
        ?.group.id ?? ''

export const overlayEvent = (overrides: Record<string, unknown>) => ({
    kind: 'content',
    position: 'right',
    group: undefined,
    getData: () => undefined,
    nativeEvent: {},
    preventDefault: vi.fn(),
    ...overrides,
})

export const payload = (type: ViewType) => ({
    dataTransfer: {
        types: [VIEW_DRAG_MIME, getViewTypeMime(type)],
        getData: () => JSON.stringify({ type }),
    },
})

/* A dockview drop event, a palette tile dropped by default */
export const dropEvent = (overrides: Record<string, unknown>) => ({
    kind: 'content',
    position: 'right',
    group: undefined,
    getData: () => undefined,
    preventDefault: vi.fn(),
    nativeEvent: payload('map'),
    ...overrides,
})
