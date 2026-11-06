import { addView } from '@components/workspace/controller/add-view'
import { fitViewSizes } from '@components/workspace/controller/grid-layout'
import {
    buildTree,
    column,
    row,
    view,
} from '@modules/workspace/__tests__/grid-tree-builders'
import { describe, expect, it } from 'vitest'
import {
    dropEvent,
    newViewGroupId,
    setup,
    twoColumns,
} from './controller-fixtures'

describe('sizes after a layout change', () => {
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

    /* As dockview 8.3.1 does it (dockToLayoutEdge): first a new, empty cell
     * at the edge, added without a layout event, then the view moving in,
     * as one layout change */
    it('sizes a move to the outer edge from the layout read at the drop', () => {
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
        fake.setLayout(
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

        expect(map.group.api.setSize).toHaveBeenCalledWith({ width: 560 })
        expect(vis.group.api.setSize).toHaveBeenCalledWith({ width: 240 })
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

    it('does nothing before the grid is measured', () => {
        const fake = setup()
        const [map] = twoColumns(fake)

        fake.api.removePanel(fake.api.getPanel('vis-a') as never)

        expect(map.group.api.setSize).not.toHaveBeenCalled()
    })
})

describe('sizes for view headers', () => {
    /* A period selector over a map, as tall as its header and content */
    const selectorOverMap = (barHeight: number) => {
        const fake = setup()
        const bar = fake.addLaidOutView(
            'bar',
            { left: 0, top: 0, width: 1200, height: barHeight },
            { type: 'period-selector' }
        )
        const map = fake.addLaidOutView('map', {
            left: 0,
            top: barHeight,
            width: 1200,
            height: 800 - barHeight,
        })
        fake.setLayout(
            buildTree(
                1200,
                800,
                column(
                    1,
                    view(bar.group.id, barHeight),
                    view(map.group.id, 800 - barHeight)
                )
            )
        )
        return { fake, bar, map }
    }

    it('fits a selector to its content when headers are hidden, and back when shown', () => {
        const { fake, bar, map } = selectorOverMap(96)

        fake.setHeadersHidden(true)
        fitViewSizes(fake.asApi)

        expect(bar.group.api.setConstraints).toHaveBeenLastCalledWith({
            minimumWidth: 240,
            minimumHeight: 61,
        })
        expect(map.group.api.setConstraints).toHaveBeenLastCalledWith({
            minimumWidth: 240,
            minimumHeight: 125,
        })
        expect(bar.group.api.setSize).toHaveBeenLastCalledWith({ height: 61 })

        fake.setLayout(
            buildTree(
                1200,
                800,
                column(1, view(bar.group.id, 61), view(map.group.id, 739))
            )
        )
        fake.setHeadersHidden(false)
        fitViewSizes(fake.asApi)
        expect(bar.group.api.setSize).toHaveBeenLastCalledWith({ height: 96 })
    })

    it('grows a selector by the header once, though dockview grows a cell to its new minimum at once', () => {
        const { fake, bar, map } = selectorOverMap(61)
        const layoutWithBar = (height: number) =>
            buildTree(
                1200,
                800,
                column(
                    1,
                    view(bar.group.id, height),
                    view(map.group.id, 800 - height)
                )
            )
        /* Sized for hidden headers, as a preset loaded while they are */
        fake.setHeadersHidden(true)
        fitViewSizes(fake.asApi)
        bar.group.api.setConstraints.mockImplementation(({ minimumHeight }) =>
            fake.setLayout(layoutWithBar(Math.max(61, minimumHeight)))
        )

        fake.setHeadersHidden(false)
        fitViewSizes(fake.asApi)

        expect(bar.group.api.setSize).toHaveBeenLastCalledWith({ height: 96 })
    })

    it('resizes nothing when the headers stay as they were', () => {
        const { fake, bar } = selectorOverMap(96)

        fitViewSizes(fake.asApi)

        expect(bar.group.api.setConstraints).toHaveBeenCalled()
        expect(bar.group.api.setSize).not.toHaveBeenCalled()
    })

    it('waits for a maximized view to be restored, and gives new cells their minimums', () => {
        const { fake, bar } = selectorOverMap(96)

        fake.setMaximized(true)
        fake.setHeadersHidden(true)
        fitViewSizes(fake.asApi)
        expect(bar.group.api.setSize).not.toHaveBeenCalled()

        /* Any layout change, as leaving maximize */
        fake.mutate(() => fake.setMaximized(false))
        expect(bar.group.api.setSize).toHaveBeenLastCalledWith({ height: 61 })
    })
})
