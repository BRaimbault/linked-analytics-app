import { ADD_VIEWS_PANEL_ID } from '@components/workspace/controller/panels'
import {
    buildTree,
    column,
    row,
    view,
} from '@modules/workspace/__tests__/grid-tree-builders'
import { describe, expect, it, vi } from 'vitest'
import {
    dropEvent,
    overlayEvent,
    payload,
    setup,
    twoColumns,
} from './controller-fixtures'

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
    })

    it('offers no drop on the tab of another view', () => {
        const fake = setup()
        const [map, vis] = twoColumns(fake)
        const onTab = overlayEvent({
            kind: 'tab',
            group: map.group,
            position: 'center',
            getData: () => ({ panelId: vis.id }),
        })

        fake.emit('onWillShowOverlay', onTab)

        expect(onTab.preventDefault).toHaveBeenCalled()
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
