import { addView } from '@components/workspace/controller/add-view'
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

    it('does nothing before the grid is measured', () => {
        const fake = setup()
        const [map] = twoColumns(fake)

        fake.api.removePanel(fake.api.getPanel('vis-a') as never)

        expect(map.group.api.setSize).not.toHaveBeenCalled()
    })
})
