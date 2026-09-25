import {
    ADD_VIEWS_PANEL_ID,
    addView,
    closeView,
    getEdgePosition,
    moveTools,
    openSettings,
    setupWorkspace,
    showSettingsForTarget,
    SwapSpacer,
    swapViews,
    swapViewsById,
} from '@components/workspace/workspace-controller'
import {
    buildTree,
    column,
    row,
    view,
} from '@modules/workspace/__tests__/grid-tree-builders'
import {
    getViewTypeMime,
    VIEW_DRAG_MIME,
} from '@modules/workspace/drag-payload'
import type { ViewType } from '@modules/workspace/view-types'
import { describe, expect, it, vi } from 'vitest'
import {
    asGroup,
    asPanel,
    createFakeDockview,
    type FakeGroup,
} from './fake-dockview'

const titles = {
    addViews: 'Add views',
    viewSettings: (title: string) => `${title} settings`,
}

const setup = () => {
    const fake = createFakeDockview()
    const dispatch = vi.fn()
    const cleanup = setupWorkspace(fake.asApi, dispatch, titles)
    const toolGroup = fake.edgeGroups.get('top') as FakeGroup
    return { ...fake, dispatch, cleanup, toolGroup }
}

/* Two side-by-side 500x800 views, laid out without firing events */
const twoColumns = (fake: ReturnType<typeof createFakeDockview>) => [
    fake.addLaidOutView('map-a', { left: 0, top: 0, width: 500, height: 800 }),
    fake.addLaidOutView(
        'vis-a',
        { left: 500, top: 0, width: 500, height: 800 },
        { type: 'visualization' }
    ),
]

const existing = (fake: ReturnType<typeof createFakeDockview>, id: string) => {
    const panel = fake.api.getPanel(id)
    if (!panel) {
        throw new Error(`No panel ${id}`)
    }
    return panel
}

/* The cell of the view dockview is adding, once it exists */
const newViewGroupId = (fake: ReturnType<typeof createFakeDockview>) =>
    fake.api.panels.filter((panel) => panel.api.component === 'view').at(-1)
        ?.group.id ?? ''

const overlayEvent = (overrides: Record<string, unknown>) => ({
    kind: 'content',
    position: 'right',
    group: undefined,
    getData: () => undefined,
    nativeEvent: {},
    preventDefault: vi.fn(),
    ...overrides,
})

const payload = (type: ViewType) => ({
    dataTransfer: {
        types: [VIEW_DRAG_MIME, getViewTypeMime(type)],
        getData: () => JSON.stringify({ type }),
    },
})

describe('addView', () => {
    it('fills an empty grid', () => {
        const fake = createFakeDockview()

        const result = addView(fake.asApi, 'map')

        expect(result).toEqual({ status: 'added', viewId: expect.any(String) })
        expect(fake.api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({
                component: 'view',
                title: 'Map 1',
                params: { type: 'map', number: 1 },
                position: { direction: 'right' },
            })
        )
    })

    it('uses a given placement as is', () => {
        const fake = createFakeDockview()
        const placement = { direction: 'left' as const }

        addView(fake.asApi, 'map', { placement })

        expect(fake.api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({ position: placement })
        )
    })

    it('refuses a fifth view', () => {
        const fake = createFakeDockview()
        for (const id of ['a', 'b', 'c', 'd']) {
            fake.addLaidOutView(id, {
                left: 0,
                top: 0,
                width: 999,
                height: 999,
            })
        }

        expect(addView(fake.asApi, 'map')).toEqual({ status: 'full' })
        expect(fake.api.addPanel).not.toHaveBeenCalled()
    })

    it('goes right of the selected view when it is wide enough', () => {
        const fake = createFakeDockview()
        const [map] = twoColumns(fake)

        addView(fake.asApi, 'map', { nextToViewId: 'map-a' })

        expect(fake.api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({
                position: { referenceGroup: map.group, direction: 'right' },
            })
        )
    })

    it('goes below the selected view when it is too narrow', () => {
        const fake = createFakeDockview()
        const narrow = fake.addLaidOutView('narrow', {
            left: 0,
            top: 0,
            width: 300,
            height: 800,
        })

        addView(fake.asApi, 'map', { nextToViewId: 'narrow' })

        expect(fake.api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({
                position: { referenceGroup: narrow.group, direction: 'below' },
            })
        )
    })

    it('falls back to the largest other view, next to the last one by default', () => {
        const fake = createFakeDockview()
        fake.addLaidOutView('small', {
            left: 0,
            top: 0,
            width: 300,
            height: 300,
        })
        const large = fake.addLaidOutView('large', {
            left: 300,
            top: 0,
            width: 600,
            height: 600,
        })
        fake.addLaidOutView('tiny', {
            left: 900,
            top: 0,
            width: 100,
            height: 100,
        })

        addView(fake.asApi, 'map', { nextToViewId: 'unknown' })

        expect(fake.api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({
                position: { referenceGroup: large.group, direction: 'right' },
            })
        )
    })

    it('reports when no view has room for a split', () => {
        const fake = createFakeDockview()
        fake.addLaidOutView('small', {
            left: 0,
            top: 0,
            width: 300,
            height: 300,
        })

        expect(addView(fake.asApi, 'map')).toEqual({ status: 'no-room' })
    })
})

describe('drop overlay', () => {
    it('lets a new view split a cell with room', () => {
        const fake = setup()
        const [map] = twoColumns(fake)
        const event = overlayEvent({ group: map.group })

        fake.emit('onWillShowOverlay', event)

        expect(event.preventDefault).not.toHaveBeenCalled()
    })

    it('refuses a split without room', () => {
        const fake = setup()
        const small = fake.addLaidOutView('small', {
            left: 0,
            top: 0,
            width: 300,
            height: 300,
        })
        for (const position of ['right', 'bottom']) {
            const event = overlayEvent({ group: small.group, position })
            fake.emit('onWillShowOverlay', event)
            expect(event.preventDefault).toHaveBeenCalled()
        }
    })

    it('refuses the middle of a view for a new view, but swaps a dragged one', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        const fromPalette = overlayEvent({
            group: map.group,
            position: 'center',
        })
        const fromTab = overlayEvent({
            group: map.group,
            position: 'center',
            getData: () => ({ panelId: vis.id }),
        })
        const ontoItself = overlayEvent({
            group: map.group,
            position: 'center',
            getData: () => ({ panelId: map.id }),
        })

        fake.emit('onWillShowOverlay', fromPalette)
        fake.emit('onWillShowOverlay', fromTab)
        fake.emit('onWillShowOverlay', ontoItself)

        expect(fromPalette.preventDefault).toHaveBeenCalled()
        expect(fromTab.preventDefault).not.toHaveBeenCalled()
        expect(ontoItself.preventDefault).toHaveBeenCalled()
    })

    it('fits a selector from the palette where a plugin has no room', () => {
        const fake = setup()
        const short = fake.addLaidOutView('short', {
            left: 0,
            top: 0,
            width: 1000,
            height: 300,
        })
        const plugin = overlayEvent({
            group: short.group,
            position: 'bottom',
            nativeEvent: payload('map'),
        })
        const selectorDrop = overlayEvent({
            group: short.group,
            position: 'bottom',
            nativeEvent: payload('org-unit-selector'),
        })

        fake.emit('onWillShowOverlay', plugin)
        fake.emit('onWillShowOverlay', selectorDrop)

        expect(plugin.preventDefault).toHaveBeenCalled()
        expect(selectorDrop.preventDefault).not.toHaveBeenCalled()
    })

    it('keeps tools out of the grid and views out of the tools strip', () => {
        const fake = setup()
        const [map] = twoColumns(fake)
        const tool = overlayEvent({
            group: map.group,
            getData: () => ({ panelId: ADD_VIEWS_PANEL_ID }),
        })
        const settings = overlayEvent({
            group: map.group,
            getData: () => ({ panelId: 'settings-map-a' }),
        })
        const viewIntoTools = overlayEvent({ group: fake.toolGroup })

        for (const event of [tool, settings, viewIntoTools]) {
            fake.emit('onWillShowOverlay', event)
            expect(event.preventDefault).toHaveBeenCalled()
        }
    })

    it('checks the room left for a new line at the outer edges', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        fake.setLayout(
            buildTree(1000, 800, row(1, view(map.group.id), view(vis.group.id)))
        )
        const column = overlayEvent({ kind: 'edge', position: 'left' })
        const row3 = overlayEvent({ kind: 'edge', position: 'bottom' })

        fake.emit('onWillShowOverlay', column)
        fake.emit('onWillShowOverlay', row3)

        expect(column.preventDefault).not.toHaveBeenCalled()
        expect(row3.preventDefault).not.toHaveBeenCalled()

        fake.setLayout(
            buildTree(700, 800, row(1, view(map.group.id), view(vis.group.id)))
        )
        const tooNarrow = overlayEvent({ kind: 'edge', position: 'right' })
        fake.emit('onWillShowOverlay', tooNarrow)
        expect(tooNarrow.preventDefault).toHaveBeenCalled()
    })

    it('leaves the dragged view out of the room it needs at the outer edges', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        const short = fake.addLaidOutView('short', {
            left: 500,
            top: 640,
            width: 500,
            height: 160,
        })
        /* map | (vis over a short view): a new row would leave the short
         * view below its minimum, unless it is the one moving */
        fake.setLayout(
            buildTree(
                1000,
                479,
                row(
                    1,
                    view(map.group.id),
                    column(1, view(vis.group.id, 2), view(short.group.id, 1))
                )
            )
        )
        const moveShort = overlayEvent({
            kind: 'edge',
            position: 'top',
            getData: () => ({ panelId: short.id }),
        })
        const addNew = overlayEvent({ kind: 'edge', position: 'top' })

        fake.emit('onWillShowOverlay', moveShort)
        fake.emit('onWillShowOverlay', addNew)

        expect(moveShort.preventDefault).not.toHaveBeenCalled()
        expect(addNew.preventDefault).toHaveBeenCalled()
    })

    it('offers no drop that would leave a view where it is', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        fake.setLayout(
            buildTree(1000, 800, row(1, view(map.group.id), view(vis.group.id)))
        )
        const drag = { getData: () => ({ panelId: map.id, groupId: '' }) }
        const ownCell = overlayEvent({ ...drag, group: map.group })
        const facingEdge = overlayEvent({
            ...drag,
            group: vis.group,
            position: 'left',
        })
        const ownOuterEdge = overlayEvent({
            ...drag,
            kind: 'edge',
            position: 'left',
        })
        const realMove = overlayEvent({
            ...drag,
            kind: 'edge',
            position: 'right',
        })

        for (const event of [ownCell, facingEdge, ownOuterEdge, realMove]) {
            fake.emit('onWillShowOverlay', event)
        }

        expect(ownCell.preventDefault).toHaveBeenCalled()
        expect(facingEdge.preventDefault).toHaveBeenCalled()
        expect(ownOuterEdge.preventDefault).toHaveBeenCalled()
        expect(realMove.preventDefault).not.toHaveBeenCalled()
    })

    it('judges a dragged view that is gone as taking no room', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        fake.setLayout(
            buildTree(1000, 800, row(1, view(map.group.id), view(vis.group.id)))
        )
        const event = overlayEvent({
            kind: 'edge',
            position: 'bottom',
            getData: () => ({ panelId: 'map-gone', groupId: '' }),
        })

        fake.emit('onWillShowOverlay', event)

        expect(event.preventDefault).not.toHaveBeenCalled()
    })

    it('recognises a view dragged by its group rather than its tab', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        const event = overlayEvent({
            group: vis.group,
            position: 'center',
            getData: () => ({ panelId: null, groupId: map.group.id }),
        })

        fake.emit('onWillShowOverlay', event)

        expect(event.preventDefault).not.toHaveBeenCalled()
    })

    it('fills an empty grid from its outer edge or centre', () => {
        const fake = setup()
        for (const position of ['left', 'center']) {
            const event = overlayEvent({ kind: 'edge', position })
            fake.emit('onWillShowOverlay', event)
            expect(event.preventDefault).not.toHaveBeenCalled()
        }
    })
})

describe('palette drags', () => {
    const dragOver = (nativeEvent: unknown) => ({
        nativeEvent,
        accept: vi.fn(),
    })

    it('accepts a view dragged from the palette while there is space', () => {
        const fake = setup()
        const event = dragOver(payload('map'))

        fake.emit('onUnhandledDragOver', event)

        expect(event.accept).toHaveBeenCalled()
    })

    it('ignores other drags, touch drags and drags into a full workspace', () => {
        const fake = setup()
        const other = dragOver({ dataTransfer: { types: ['text/plain'] } })
        const touch = dragOver({})
        fake.emit('onUnhandledDragOver', other)
        fake.emit('onUnhandledDragOver', touch)
        for (const id of ['a', 'b', 'c', 'd']) {
            fake.addLaidOutView(id, {
                left: 0,
                top: 0,
                width: 999,
                height: 999,
            })
        }
        const full = dragOver(payload('map'))
        fake.emit('onUnhandledDragOver', full)

        expect(other.accept).not.toHaveBeenCalled()
        expect(touch.accept).not.toHaveBeenCalled()
        expect(full.accept).not.toHaveBeenCalled()
    })
})

describe('drops', () => {
    const dropEvent = (overrides: Record<string, unknown>) => ({
        kind: 'content',
        position: 'right',
        group: undefined,
        getData: () => undefined,
        preventDefault: vi.fn(),
        nativeEvent: payload('map'),
        ...overrides,
    })

    it('adds a view where a palette drag is dropped', () => {
        const fake = setup()
        const [map] = twoColumns(fake)
        const event = dropEvent({ group: map.group, position: 'bottom' })

        fake.emit('onWillDrop', event)
        fake.emit('onDidDrop', event)

        expect(event.preventDefault).not.toHaveBeenCalled()
        expect(fake.api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({
                component: 'view',
                position: { referenceGroup: map.group, direction: 'below' },
            })
        )
    })

    it('fills an empty grid with a centre drop', () => {
        const fake = setup()

        fake.emit('onDidDrop', dropEvent({ kind: 'edge', position: 'center' }))

        expect(fake.api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({
                component: 'view',
                position: { direction: 'right' },
            })
        )
    })

    it('treats a drop on the tools strip as a drop on the grid edge', () => {
        const fake = setup()

        fake.emit(
            'onDidDrop',
            dropEvent({ group: fake.toolGroup, position: 'left' })
        )

        expect(fake.api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({
                component: 'view',
                position: { direction: 'left' },
            })
        )
    })

    it('keeps the proportions of the other views when a palette drop adds a column', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        fake.setLayout(
            buildTree(
                1200,
                800,
                row(1, view(map.group.id, 70), view(vis.group.id, 30))
            )
        )
        fake.changeLayoutTo(() =>
            buildTree(
                1200,
                800,
                row(
                    1,
                    view(map.group.id),
                    view(vis.group.id),
                    view(newViewGroupId(fake))
                )
            )
        )
        const event = dropEvent({ kind: 'edge', position: 'right' })

        fake.emit('onWillDrop', event)
        fake.emit('onDidDrop', event)

        expect(map.group.api.setSize).toHaveBeenCalledWith({ width: 560 })
        expect(vis.group.api.setSize).toHaveBeenCalledWith({ width: 240 })
    })

    it('reads the layout when a tab is dropped, before dockview reshapes it', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        const moved = fake.addLaidOutView('moved', {
            left: 420,
            top: 400,
            width: 780,
            height: 400,
        })
        const before = buildTree(
            1200,
            800,
            row(
                1,
                view(map.group.id, 35),
                column(65, view(vis.group.id), view(moved.group.id))
            )
        )
        fake.setLayout(before)

        fake.emit(
            'onWillDrop',
            dropEvent({
                kind: 'edge',
                position: 'right',
                getData: () => ({ panelId: moved.id, groupId: '' }),
            })
        )
        /* dockview wraps the grid for an outer-edge drop before it
         * announces the change */
        fake.setLayout(buildTree(1200, 800, row(1, view('wrapper'))))
        fake.changeLayoutTo(() =>
            buildTree(
                1200,
                800,
                row(
                    1,
                    view(map.group.id),
                    view(vis.group.id),
                    view(moved.group.id)
                )
            )
        )
        moved.api.moveTo({ group: moved.group, position: 'right' })

        expect(map.group.api.setSize).toHaveBeenCalledWith({ width: 280 })
        expect(vis.group.api.setSize).toHaveBeenCalledWith({ width: 520 })
    })

    it('keeps the expected change across a move dockview makes in two steps', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        fake.setLayout(
            buildTree(
                1200,
                800,
                row(1, view(map.group.id, 70), view(vis.group.id, 30))
            )
        )
        const moved = fake.addLaidOutView('moved', {
            left: 0,
            top: 0,
            width: 0,
            height: 0,
        })
        fake.setLayout(
            buildTree(
                1200,
                800,
                column(
                    1,
                    row(3, view(map.group.id, 70), view(vis.group.id, 30)),
                    view(moved.group.id, 1)
                )
            )
        )

        fake.emit(
            'onWillDrop',
            dropEvent({
                kind: 'edge',
                position: 'right',
                getData: () => ({ panelId: moved.id, groupId: '' }),
            })
        )
        /* First a new, empty cell at the edge, then the view moving in */
        fake.changeLayoutTo(() =>
            buildTree(
                1200,
                800,
                row(
                    1,
                    column(3, row(1, view(map.group.id), view(vis.group.id))),
                    view('new-cell')
                )
            )
        )
        fake.mutate(() => undefined)
        fake.changeLayoutTo(() =>
            buildTree(
                1200,
                800,
                row(
                    1,
                    view(map.group.id),
                    view(vis.group.id),
                    view(moved.group.id)
                )
            )
        )
        fake.mutate(() => undefined)

        expect(map.group.api.setSize).toHaveBeenLastCalledWith({ width: 560 })
        expect(vis.group.api.setSize).toHaveBeenLastCalledWith({ width: 240 })
    })

    it('halves the cell a tab is dropped on', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        const moved = fake.addLaidOutView('moved', {
            left: 0,
            top: 600,
            width: 1200,
            height: 200,
        })
        fake.setLayout(
            buildTree(
                1200,
                800,
                column(
                    1,
                    row(3, view(map.group.id, 70), view(vis.group.id, 30)),
                    view(moved.group.id, 1)
                )
            )
        )

        fake.emit(
            'onWillDrop',
            dropEvent({
                group: map.group,
                position: 'right',
                getData: () => ({ panelId: moved.id, groupId: '' }),
            })
        )
        fake.changeLayoutTo(() =>
            buildTree(
                1200,
                800,
                row(
                    1,
                    view(map.group.id),
                    view(moved.group.id),
                    view(vis.group.id)
                )
            )
        )
        moved.api.moveTo({ group: moved.group, position: 'right' })

        expect(map.group.api.setSize).toHaveBeenCalledWith({ width: 420 })
        expect(moved.group.api.setSize).toHaveBeenCalledWith({ width: 420 })
    })

    it('halves a cell given by its id', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        fake.setLayout(
            buildTree(
                1200,
                800,
                row(1, view(map.group.id, 70), view(vis.group.id, 30))
            )
        )
        fake.changeLayoutTo(() =>
            buildTree(
                1200,
                800,
                row(
                    1,
                    view(map.group.id),
                    view(newViewGroupId(fake)),
                    view(vis.group.id)
                )
            )
        )

        addView(fake.asApi, 'map', {
            placement: { referenceGroup: map.group.id, direction: 'right' },
        })

        expect(map.group.api.setSize).toHaveBeenCalledWith({ width: 420 })
    })

    it('shares the space of a closed view among its neighbours in proportion', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        const closed = fake.addLaidOutView('closed', {
            left: 0,
            top: 0,
            width: 0,
            height: 0,
        })
        fake.setLayout(
            buildTree(
                1200,
                800,
                row(
                    1,
                    view(map.group.id, 48),
                    view(closed.group.id, 19),
                    view(vis.group.id, 33)
                )
            )
        )
        fake.changeLayoutTo(() =>
            buildTree(1200, 800, row(1, view(map.group.id), view(vis.group.id)))
        )

        fake.api.removePanel(closed)

        expect(map.group.api.setSize).toHaveBeenCalledWith({ width: 711 })
    })

    it('leaves sizes alone while a view is maximized, and puts them back after', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        fake.setLayout(
            buildTree(
                1200,
                800,
                row(1, view(map.group.id, 70), view(vis.group.id, 30))
            )
        )

        fake.mutate(() => fake.setMaximized(true))
        expect(map.group.api.setSize).not.toHaveBeenCalled()

        fake.changeLayoutTo(() =>
            buildTree(1200, 800, row(1, view(map.group.id), view(vis.group.id)))
        )
        fake.mutate(() => fake.setMaximized(false))
        expect(map.group.api.setSize).toHaveBeenCalledWith({ width: 840 })
    })

    it('forgets an expected change dockview never made', async () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        const layout = buildTree(
            1200,
            800,
            row(1, view(map.group.id, 70), view(vis.group.id, 30))
        )
        fake.setLayout(layout)

        fake.emit(
            'onWillDrop',
            dropEvent({
                kind: 'edge',
                position: 'left',
                getData: () => ({ panelId: vis.id, groupId: '' }),
            })
        )
        await Promise.resolve()
        fake.mutate(() => undefined)

        expect(map.group.api.setSize).not.toHaveBeenCalled()
    })

    it('ignores a moved view that is gone and cells that are gone', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        fake.setLayout(
            buildTree(
                1200,
                800,
                row(1, view(map.group.id, 70), view(vis.group.id, 30))
            )
        )
        fake.emit(
            'onWillDrop',
            dropEvent({
                kind: 'edge',
                position: 'left',
                getData: () => ({ panelId: vis.id, groupId: '' }),
            })
        )
        fake.changeLayoutTo(() =>
            buildTree(1200, 800, row(1, view('gone'), view(map.group.id)))
        )

        fake.api.removePanel(vis)

        expect(map.group.api.setSize).not.toHaveBeenCalled()
    })

    it('caps a selector\u2019s cell only where no plugin shares its length', () => {
        const fake = setup()
        const [map] = twoColumns(fake)
        const selectorView = fake.addLaidOutView(
            'ou-a',
            { left: 0, top: 0, width: 0, height: 0 },
            { type: 'org-unit-selector' }
        )
        fake.setLayout(
            buildTree(
                1200,
                800,
                column(1, view(selectorView.group.id), view(map.group.id))
            )
        )
        fake.changeLayoutTo(() =>
            buildTree(
                1200,
                800,
                column(1, view(selectorView.group.id, 1), view(map.group.id, 5))
            )
        )

        fake.mutate(() => undefined)

        /* Its height is its own; its width is the plugin's too */
        expect(selectorView.group.api.setConstraints).toHaveBeenCalledWith({
            maximumWidth: Number.MAX_SAFE_INTEGER,
            maximumHeight: 240,
        })
        /* The plugin's cell has no maximum to change */
        expect(map.group.api.setConstraints).not.toHaveBeenCalled()
        /* The grid is laid out again once, at the shell's size */
        expect(fake.api.layout).toHaveBeenCalledWith(1200, 900, true)

        fake.api.layout.mockClear()
        fake.mutate(() => undefined)
        expect(fake.api.layout).not.toHaveBeenCalled()
    })

    it('sets the maximums even before there is a layout to compare with', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        fake.changeLayoutTo(() =>
            buildTree(1200, 800, row(1, view(map.group.id), view(vis.group.id)))
        )

        fake.mutate(() => undefined)

        expect(fake.api.toJSON).toHaveBeenCalled()
        expect(map.group.api.setSize).not.toHaveBeenCalled()
    })

    it('does nothing before the grid is measured', () => {
        const fake = setup()
        const [map] = twoColumns(fake)

        fake.api.removePanel(fake.api.getPanel('vis-a') as never)

        expect(map.group.api.setSize).not.toHaveBeenCalled()
    })

    it('does nothing for drops without a valid view payload', () => {
        const fake = setup()
        const addCalls = fake.api.addPanel.mock.calls.length

        fake.emit('onDidDrop', dropEvent({ nativeEvent: {} }))
        fake.emit(
            'onDidDrop',
            dropEvent({
                nativeEvent: {
                    dataTransfer: {
                        getData: () => JSON.stringify({ type: 'x' }),
                    },
                },
            })
        )

        expect(fake.api.addPanel).toHaveBeenCalledTimes(addCalls)
    })

    it('swaps views dropped onto each other', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        const mapCell = map.group
        const visCell = vis.group
        const event = dropEvent({
            group: mapCell,
            position: 'center',
            getData: () => ({ panelId: vis.id }),
        })

        fake.emit('onWillDrop', event)

        expect(event.preventDefault).toHaveBeenCalled()
        expect(map.group).toBe(visCell)
        expect(vis.group).toBe(mapCell)
        expect(vis.group).toBe(mapCell)
    })

    it('ignores a swap whose dragged or target view is gone', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)

        fake.emit(
            'onWillDrop',
            dropEvent({
                group: map.group,
                position: 'center',
                getData: () => ({ panelId: 'gone' }),
            })
        )
        fake.emit(
            'onWillDrop',
            dropEvent({
                group: { ...map.group, activePanel: undefined },
                position: 'center',
                getData: () => ({ panelId: vis.id }),
            })
        )

        expect(map.api.moveTo).not.toHaveBeenCalled()
        expect(vis.api.moveTo).not.toHaveBeenCalled()
    })
})

describe('swapping', () => {
    it('moves the two views through temporary spacers and selects the dragged one', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        const mapCell = map.group
        const visCell = vis.group

        swapViews(fake.asApi, asPanel(map), asPanel(vis))

        expect(map.group).toBe(visCell)
        expect(vis.group).toBe(mapCell)
        expect(fake.api.removePanel).toHaveBeenCalledTimes(2)
        expect(map.api.setActive).toHaveBeenCalled()
        expect(SwapSpacer()).toBeNull()
    })

    it('does nothing for views in the same cell or views that are gone', () => {
        const fake = setup()
        const [map] = twoColumns(fake)

        swapViews(fake.asApi, asPanel(map), asPanel(map))
        swapViewsById(fake.asApi, 'map-a', 'gone')

        expect(map.api.moveTo).not.toHaveBeenCalled()
    })

    it('swaps by id', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        const visCell = vis.group

        swapViewsById(fake.asApi, 'map-a', 'vis-a')

        expect(map.group).toBe(visCell)
    })
})

describe('selection and settings', () => {
    const addView = (fake: ReturnType<typeof setup>, id: string) =>
        fake.api.addPanel({
            id,
            component: 'view',
            title: id,
            params: { type: 'map', number: 1 },
        })

    it('mirrors views in the store and gives each a settings tab after Add views', () => {
        const fake = setup()

        addView(fake, 'map-a')
        addView(fake, 'map-b')

        expect(fake.dispatch).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'workspace/viewAdded' })
        )
        expect(fake.toolGroup.panels.map(({ id }) => id)).toEqual([
            ADD_VIEWS_PANEL_ID,
            'settings-map-a',
            'settings-map-b',
        ])
        expect(fake.api.getPanel('settings-map-a')?.title).toBe(
            'map-a settings'
        )
    })

    it('adds a settings tab once, and none once the tools are gone', () => {
        const fake = setup()
        const view = addView(fake, 'map-a')
        fake.emit('onDidAddPanel', view)
        expect(
            fake.toolGroup.panels.filter(({ id }) => id === 'settings-map-a')
        ).toHaveLength(1)

        fake.api.removePanel(existing(fake, ADD_VIEWS_PANEL_ID))
        addView(fake, 'map-b')
        expect(fake.api.getPanel('settings-map-b')).toBeUndefined()
    })

    it('titles a settings tab even for an untitled view', () => {
        const fake = setup()

        fake.api.addPanel({
            id: 'untitled',
            component: 'view',
            params: { type: 'map', number: 1 },
        })

        expect(fake.api.getPanel('settings-untitled')?.title).toBe(' settings')
    })

    it('ignores tools being added', () => {
        const fake = setup()
        fake.dispatch.mockClear()

        fake.emit('onDidAddPanel', fake.api.getPanel(ADD_VIEWS_PANEL_ID))

        expect(fake.dispatch).not.toHaveBeenCalled()
    })

    it('shows the settings of a view the user selects, not of one just added', () => {
        const fake = setup()
        const map = addView(fake, 'map-a')
        const settings = fake.api.getPanel('settings-map-a')

        fake.emit('onDidActivePanelChange', { panel: map, origin: 'api' })
        expect(fake.toolGroup.model.openPanel).not.toHaveBeenCalled()

        fake.emit('onDidActivePanelChange', { panel: map, origin: 'user' })
        expect(fake.toolGroup.model.openPanel).toHaveBeenCalledWith(settings, {
            skipSetGroupActive: true,
        })
    })

    it('ignores tools and empty selections', () => {
        const fake = setup()
        fake.dispatch.mockClear()

        fake.emit('onDidActivePanelChange', {
            panel: undefined,
            origin: 'user',
        })
        fake.emit('onDidActivePanelChange', {
            panel: fake.api.getPanel(ADD_VIEWS_PANEL_ID),
            origin: 'user',
        })

        expect(fake.dispatch).not.toHaveBeenCalled()
    })

    it('selects a neighbour when the selected view closes', () => {
        const fake = setup()
        const map = addView(fake, 'map-a')
        const vis = addView(fake, 'vis-a')
        fake.emit('onDidActivePanelChange', { panel: map, origin: 'user' })

        fake.api.removePanel(map)

        expect(vis.api.setActive).toHaveBeenCalled()
        expect(fake.api.getPanel('settings-map-a')).toBeUndefined()
        expect(fake.toolGroup.model.openPanel).toHaveBeenLastCalledWith(
            fake.api.getPanel('settings-vis-a'),
            { skipSetGroupActive: true }
        )
    })

    it('goes back to the palette when the last selected view closes', () => {
        const fake = setup()
        const map = addView(fake, 'map-a')
        fake.emit('onDidActivePanelChange', { panel: map, origin: 'user' })

        fake.api.removePanel(map)

        expect(fake.toolGroup.model.openPanel).toHaveBeenLastCalledWith(
            fake.api.getPanel(ADD_VIEWS_PANEL_ID),
            { skipSetGroupActive: true }
        )
    })

    it('shows the selected view again when another view shown in the strip closes', () => {
        const fake = setup()
        const map = addView(fake, 'map-a')
        const vis = addView(fake, 'vis-a')
        fake.emit('onDidActivePanelChange', { panel: map, origin: 'user' })
        fake.toolGroup.activePanel = fake.api.getPanel('settings-vis-a')

        fake.api.removePanel(vis)

        expect(fake.toolGroup.model.openPanel).toHaveBeenLastCalledWith(
            fake.api.getPanel('settings-map-a'),
            { skipSetGroupActive: true }
        )
    })

    it('leaves the strip alone when an unselected view closes', () => {
        const fake = setup()
        const map = addView(fake, 'map-a')
        const vis = addView(fake, 'vis-a')
        fake.emit('onDidActivePanelChange', { panel: map, origin: 'user' })
        fake.toolGroup.model.openPanel.mockClear()
        fake.api.removePanel(existing(fake, 'settings-vis-a'))

        fake.api.removePanel(vis)

        expect(fake.toolGroup.model.openPanel).not.toHaveBeenCalled()
    })

    it('ignores tools being removed', () => {
        const fake = setup()
        fake.dispatch.mockClear()

        fake.api.removePanel(existing(fake, ADD_VIEWS_PANEL_ID))

        expect(fake.dispatch).not.toHaveBeenCalled()
    })

    it('opens the settings of a view, expanding the strip', () => {
        const fake = setup()
        addView(fake, 'map-a')
        fake.toolGroup.api.collapse()

        openSettings(fake.asApi, 'map-a')
        openSettings(fake.asApi, 'gone')

        expect(fake.toolGroup.api.isCollapsed()).toBe(false)
        expect(
            fake.api.getPanel('settings-map-a')?.api.setActive
        ).toHaveBeenCalled()
    })
})

describe('showSettingsForTarget', () => {
    it('finds the view from its body or its tab', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        fake.api.addPanel({
            id: 'settings-map-a',
            component: 'view-settings',
            position: { referenceGroup: fake.toolGroup },
            inactive: true,
        })
        fake.api.addPanel({
            id: 'settings-vis-a',
            component: 'view-settings',
            position: { referenceGroup: fake.toolGroup },
            inactive: true,
        })
        const body = document.createElement('div')
        body.setAttribute('data-view-id', map.id)
        const inner = document.createElement('span')
        body.appendChild(inner)
        const tab = document.createElement('div')
        vis.group.element.contains = (node) => node === tab

        showSettingsForTarget(fake.asApi, inner)
        expect(fake.toolGroup.model.openPanel).toHaveBeenLastCalledWith(
            fake.api.getPanel('settings-map-a'),
            { skipSetGroupActive: true }
        )

        showSettingsForTarget(fake.asApi, tab)
        expect(fake.toolGroup.model.openPanel).toHaveBeenLastCalledWith(
            fake.api.getPanel('settings-vis-a'),
            { skipSetGroupActive: true }
        )
    })

    it('ignores targets outside views and non-elements', () => {
        const fake = setup()
        twoColumns(fake)

        showSettingsForTarget(fake.asApi, document.createElement('div'))
        showSettingsForTarget(fake.asApi, null)
        showSettingsForTarget(fake.asApi, document.createTextNode('text'))

        expect(fake.toolGroup.model.openPanel).not.toHaveBeenCalled()
    })
})

describe('closeView', () => {
    it('closes a view, and does nothing for one that is gone', () => {
        const fake = setup()
        const [map] = twoColumns(fake)

        closeView(fake.asApi, 'gone')
        closeView(fake.asApi, map.id)

        expect(fake.api.removePanel).toHaveBeenCalledTimes(1)
        expect(fake.api.getPanel(map.id)).toBeUndefined()
    })
})

describe('moveTools', () => {
    it('moves every tool to the new edge, keeping the open tab', () => {
        const fake = setup()
        const addViews = fake.api.getPanel(ADD_VIEWS_PANEL_ID)
        addViews?.api.setActive()
        addViews?.api.setActive.mockClear()

        moveTools(fake.asApi, 'top', 'left')

        const left = fake.edgeGroups.get('left') as FakeGroup
        expect(left.panels.map(({ id }) => id)).toEqual([ADD_VIEWS_PANEL_ID])
        expect(fake.api.removeEdgeGroup).toHaveBeenCalledWith('top')
        expect(addViews?.api.setActive).toHaveBeenCalledTimes(1)
        expect(left.api.collapse).not.toHaveBeenCalled()
        expect(getEdgePosition(asGroup(left))).toBe('left')
    })

    it('keeps a collapsed strip collapsed', () => {
        const fake = setup()
        fake.toolGroup.api.collapse()

        moveTools(fake.asApi, 'top', 'bottom')

        expect(
            (fake.edgeGroups.get('bottom') as FakeGroup).api.collapse
        ).toHaveBeenCalled()
    })

    it('does nothing without a strip to move, a new edge or a target', () => {
        const fake = setup()

        moveTools(fake.asApi, 'left', 'top')
        moveTools(fake.asApi, 'top', 'top')
        const getGroup = vi
            .spyOn(fake.api, 'getGroup')
            .mockImplementation((id) =>
                id === fake.toolGroup.id ? fake.toolGroup : undefined
            )
        moveTools(fake.asApi, 'top', 'right')
        getGroup.mockRestore()

        expect(fake.api.removeEdgeGroup).not.toHaveBeenCalled()
    })
})

describe('setupWorkspace', () => {
    it('adds the tools once and removes every listener on cleanup', () => {
        const fake = setup()
        const addCalls = fake.api.addPanel.mock.calls.length

        const second = setupWorkspace(fake.asApi, vi.fn(), titles)
        second()
        fake.cleanup()

        expect(fake.api.addPanel).toHaveBeenCalledTimes(addCalls)
        expect(fake.listenerCount()).toBe(0)
    })

    it('reads the grid edge of a group', () => {
        const fake = setup()
        const [map] = twoColumns(fake)

        expect(getEdgePosition(asGroup(map.group))).toBeNull()
        expect(getEdgePosition(asGroup(fake.toolGroup))).toBe('top')
    })
})
