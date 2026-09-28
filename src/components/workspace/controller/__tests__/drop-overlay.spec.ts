import {
    buildTree,
    column,
    row,
    view,
} from '@modules/workspace/__tests__/grid-tree-builders'
import { describe, expect, it } from 'vitest'
import { overlayEvent, payload, setup, twoColumns } from './controller-fixtures'

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
