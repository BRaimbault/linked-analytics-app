import { InsertZones } from '@components/workspace/insert-zones'
import {
    buildTree,
    row,
    view,
} from '@modules/workspace/__tests__/grid-tree-builders'
import { VIEW_DRAG_MIME } from '@modules/workspace/drag-payload'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createFakeDockview } from './fake-dockview'

/* What dockview says is being dragged by a tab, if anything */
const drag = vi.hoisted(() => ({
    data: undefined as { panelId: string | null; groupId: string } | undefined,
}))

vi.mock('dockview-react', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    getPanelData: () => drag.data,
}))

const paletteTransfer = (type = 'map') => ({
    types: [VIEW_DRAG_MIME],
    getData: () => JSON.stringify({ type }),
})

/* Three 400px columns, the grid starting 10px right and 20px down */
const threeColumns = () => {
    const fake = createFakeDockview()
    const views = ['a', 'b', 'c'].map((id, index) =>
        fake.addLaidOutView(id, {
            left: 10 + index * 400,
            top: 20,
            width: 400,
            height: 800,
        })
    )
    fake.setLayout(
        buildTree(
            1200,
            800,
            row(1, ...views.map((panel) => view(panel.group.id)))
        )
    )
    return { fake, views }
}

/* The strips over dividers, leaving out the grid's outer edges */
const findDividerZones = async () =>
    (await screen.findAllByTestId('insert-zone')).filter(
        (zone) => zone.dataset.edge === undefined
    )

const findEdgeZone = async (edge: string) =>
    (await screen.findAllByTestId('insert-zone')).find(
        (zone) => zone.dataset.edge === edge
    ) as HTMLElement

const renderZones = (fake: ReturnType<typeof createFakeDockview>) =>
    render(<InsertZones api={fake.asApi} isDragging />)

describe('InsertZones', () => {
    it('shows a strip over each divider while a view is dragged from the palette', async () => {
        drag.data = undefined
        const { fake } = threeColumns()

        renderZones(fake)
        const zones = await findDividerZones()

        expect(zones).toHaveLength(2)
        expect(zones[0].style.left).toBe(`${10 + 400 - 12}px`)
        expect(zones[0].style.top).toBe('20px')
        expect(zones[0].dataset.axis).toBe('horizontal')
    })

    it('shows nothing when no drag is going on, or before the workspace is ready', async () => {
        const { fake } = threeColumns()
        const { rerender } = render(
            <InsertZones api={fake.asApi} isDragging={false} />
        )
        rerender(<InsertZones api={null} isDragging />)
        await new Promise((resolve) => setTimeout(resolve))

        expect(screen.queryAllByTestId('insert-zone')).toHaveLength(0)
    })

    it('clears the strips once the drag ends', async () => {
        drag.data = undefined
        const { fake } = threeColumns()
        const { rerender } = renderZones(fake)
        await screen.findAllByTestId('insert-zone')

        rerender(<InsertZones api={fake.asApi} isDragging={false} />)

        expect(screen.queryAllByTestId('insert-zone')).toHaveLength(0)
    })

    it('highlights a strip a palette view is dragged over, and inserts it there', async () => {
        drag.data = undefined
        const { fake, views } = threeColumns()
        renderZones(fake)
        const [zone] = await screen.findAllByTestId('insert-zone')

        const accepted = !fireEvent.dragOver(zone, {
            dataTransfer: paletteTransfer(),
        })
        expect(accepted).toBe(true)
        expect(zone).toHaveAttribute('data-active')

        fireEvent.drop(zone, { dataTransfer: paletteTransfer() })

        expect(zone).not.toHaveAttribute('data-active')
        expect(fake.api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({
                component: 'view',
                position: {
                    referenceGroup: views[0].group,
                    direction: 'right',
                },
            })
        )
    })

    it('ignores other drags and forgets a strip left behind', async () => {
        drag.data = undefined
        const { fake } = threeColumns()
        renderZones(fake)
        const [first, second] = await screen.findAllByTestId('insert-zone')

        const accepted = !fireEvent.dragEnter(first, {
            dataTransfer: { types: ['text/plain'] },
        })
        fireEvent.dragOver(second, { dataTransfer: paletteTransfer() })
        fireEvent.dragLeave(first)
        expect(second).toHaveAttribute('data-active')
        fireEvent.dragLeave(second)

        expect(accepted).toBe(false)
        expect(second).not.toHaveAttribute('data-active')
    })

    it('adds nothing for a drop without a valid view payload', async () => {
        drag.data = undefined
        const { fake } = threeColumns()
        renderZones(fake)
        const [zone] = await screen.findAllByTestId('insert-zone')

        fireEvent.drop(zone, {
            dataTransfer: { types: [VIEW_DRAG_MIME], getData: () => 'x' },
        })

        expect(fake.api.addPanel).not.toHaveBeenCalled()
    })

    it('shows nothing once the workspace is full', async () => {
        drag.data = undefined
        const { fake } = threeColumns()
        fake.addLaidOutView('d', { left: 0, top: 0, width: 1, height: 1 })

        renderZones(fake)
        await new Promise((resolve) => setTimeout(resolve))

        expect(screen.queryAllByTestId('insert-zone')).toHaveLength(0)
    })

    it('moves a view dragged by its tab between two others', async () => {
        const { fake, views } = threeColumns()
        const [a, , c] = views
        drag.data = { panelId: a.id, groupId: a.group.id }

        renderZones(fake)
        const zones = await findDividerZones()
        expect(zones).toHaveLength(1)

        const accepted = !fireEvent.dragOver(zones[0], {
            dataTransfer: { types: [] },
        })
        fireEvent.drop(zones[0], { dataTransfer: { types: [] } })

        expect(accepted).toBe(true)
        expect(a.api.moveTo).toHaveBeenCalledWith({
            group: views[1].group,
            position: 'right',
        })
        expect(c.api.moveTo).not.toHaveBeenCalled()
    })

    it('shows nothing for a tool tab, and ignores a view gone by the drop', async () => {
        const { fake, views } = threeColumns()
        drag.data = { panelId: 'add-views', groupId: 'tools-top' }
        const { unmount } = renderZones(fake)
        await new Promise((resolve) => setTimeout(resolve))
        expect(screen.queryAllByTestId('insert-zone')).toHaveLength(0)
        unmount()

        drag.data = { panelId: views[0].id, groupId: views[0].group.id }
        renderZones(fake)
        const [zone] = await screen.findAllByTestId('insert-zone')
        drag.data = { panelId: 'gone', groupId: '' }

        const accepted = !fireEvent.dragOver(zone, {
            dataTransfer: { types: [] },
        })
        fireEvent.drop(zone, { dataTransfer: { types: [] } })

        expect(accepted).toBe(false)
        expect(views[0].api.moveTo).not.toHaveBeenCalled()
    })

    it('does nothing when the view next to the strip is gone', async () => {
        drag.data = undefined
        const { fake, views } = threeColumns()
        renderZones(fake)
        const [zone] = await screen.findAllByTestId('insert-zone')
        fake.groups.splice(fake.groups.indexOf(views[0].group), 1)

        fireEvent.drop(zone, { dataTransfer: paletteTransfer() })

        expect(fake.api.addPanel).not.toHaveBeenCalled()
    })

    it('shows nothing while the grid has no size', async () => {
        drag.data = undefined
        const fake = createFakeDockview()
        fake.addLaidOutView('a', { left: 0, top: 0, width: 0, height: 0 })

        renderZones(fake)
        await new Promise((resolve) => setTimeout(resolve))

        expect(screen.queryAllByTestId('insert-zone')).toHaveLength(0)
    })

    it('adds a palette view as a new line at an outer edge', async () => {
        drag.data = undefined
        const { fake } = threeColumns()
        renderZones(fake)
        const bottom = await findEdgeZone('bottom')

        expect(bottom.style.top).toBe(`${20 + 800 - 40}px`)
        fireEvent.dragOver(bottom, { dataTransfer: paletteTransfer() })
        expect(bottom).toHaveAttribute('data-active')
        fireEvent.drop(bottom, { dataTransfer: paletteTransfer() })

        expect(fake.api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({
                component: 'view',
                position: { direction: 'below' },
            })
        )
    })

    it('moves a view dragged by its tab to a new line at an outer edge', async () => {
        const { fake, views } = threeColumns()
        const [a] = views
        drag.data = { panelId: a.id, groupId: a.group.id }
        renderZones(fake)

        const right = await findEdgeZone('right')
        expect(
            screen
                .getAllByTestId('insert-zone')
                .some((zone) => zone.dataset.edge === 'left')
        ).toBe(false)
        fireEvent.drop(right, { dataTransfer: { types: [] } })

        expect(a.group.api.moveTo).toHaveBeenCalledWith({
            group: undefined,
            position: 'right',
        })
        expect(a.api.moveTo).not.toHaveBeenCalled()
    })
})
