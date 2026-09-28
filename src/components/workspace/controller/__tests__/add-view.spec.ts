import { createFakeDockview } from '@components/workspace/__tests__/fake-dockview'
import { addView } from '@components/workspace/controller/add-view'
import {
    buildTree,
    column,
    row,
    view,
} from '@modules/workspace/__tests__/grid-tree-builders'
import { describe, expect, it } from 'vitest'
import { newViewGroupId, setup, twoColumns } from './controller-fixtures'

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

    it('halves a cell wider than 16:9 side by side', () => {
        const fake = createFakeDockview()
        const wide = fake.addLaidOutView('wide', {
            left: 0,
            top: 0,
            width: 1400,
            height: 700,
        })

        addView(fake.asApi, 'map')

        expect(fake.api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({
                position: { referenceGroup: wide.group, direction: 'right' },
            })
        )
    })

    it('halves any other cell top and bottom', () => {
        const fake = createFakeDockview()
        const half = fake.addLaidOutView('half', {
            left: 0,
            top: 0,
            width: 700,
            height: 700,
        })

        addView(fake.asApi, 'map')

        expect(fake.api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({
                position: { referenceGroup: half.group, direction: 'below' },
            })
        )
    })

    it('halves the largest cell, whichever view is selected', () => {
        const fake = createFakeDockview()
        const [map] = twoColumns(fake)
        const larger = fake.addLaidOutView('larger', {
            left: 1000,
            top: 0,
            width: 900,
            height: 800,
        })
        fake.emit('onDidActivePanelChange', { panel: map, origin: 'user' })

        addView(fake.asApi, 'map')

        expect(fake.api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({
                position: { referenceGroup: larger.group, direction: 'below' },
            })
        )
    })

    it('splits the other way when the balanced way has no room', () => {
        const fake = createFakeDockview()
        /* Too short to halve top and bottom, not wider than 16:9 */
        const short = fake.addLaidOutView('short', {
            left: 0,
            top: 0,
            width: 500,
            height: 300,
        })

        addView(fake.asApi, 'map')

        expect(fake.api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({
                position: { referenceGroup: short.group, direction: 'right' },
            })
        )
    })

    it('moves on to the next largest cell when the largest has no room', () => {
        const fake = createFakeDockview()
        /* Too narrow and too short to halve either way */
        fake.addLaidOutView('full', {
            left: 0,
            top: 0,
            width: 470,
            height: 300,
        })
        const next = fake.addLaidOutView('next', {
            left: 470,
            top: 0,
            width: 400,
            height: 340,
        })

        addView(fake.asApi, 'map')

        expect(fake.api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({
                position: { referenceGroup: next.group, direction: 'below' },
            })
        )
    })

    it('starts a bar of selectors across the top for a clicked selector', () => {
        const fake = createFakeDockview()
        const [map, vis] = twoColumns(fake)
        fake.setLayout(
            buildTree(1000, 800, row(1, view(map.group.id), view(vis.group.id)))
        )

        addView(fake.asApi, 'period-selector')

        expect(fake.api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({ position: { direction: 'above' } })
        )
    })

    it('puts a clicked text view in a row across the very top', () => {
        const fake = createFakeDockview()
        const [map, vis] = twoColumns(fake)
        fake.setLayout(
            buildTree(1000, 800, row(1, view(map.group.id), view(vis.group.id)))
        )

        addView(fake.asApi, 'text')

        expect(fake.api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({ position: { direction: 'above' } })
        )
    })

    it('adds a clicked selector next to the last one in the bar', () => {
        const fake = createFakeDockview()
        const [map] = twoColumns(fake)
        const barSelector = fake.addLaidOutView(
            'ou-a',
            { left: 0, top: 0, width: 1000, height: 120 },
            { type: 'org-unit-selector' }
        )
        fake.setLayout(
            buildTree(
                1000,
                800,
                column(1, view(barSelector.group.id, 1), view(map.group.id, 5))
            )
        )

        addView(fake.asApi, 'data-selector')

        expect(fake.api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({
                position: {
                    referenceGroup: barSelector.group.id,
                    direction: 'right',
                },
            })
        )
    })

    it('adds a selector to the bar as a new line, not by halving the last one', () => {
        const fake = setup()
        const orgUnits = fake.addLaidOutView(
            'ou-a',
            { left: 0, top: 0, width: 600, height: 120 },
            { type: 'org-unit-selector' }
        )
        const periods = fake.addLaidOutView(
            'pe-a',
            { left: 600, top: 0, width: 400, height: 120 },
            { type: 'period-selector' }
        )
        const bar = [view(orgUnits.group.id, 3), view(periods.group.id, 2)]
        fake.setLayout(buildTree(1000, 120, row(1, ...bar)))
        /* dockview spreads the space evenly */
        fake.changeLayoutTo(() =>
            buildTree(
                1000,
                120,
                row(
                    1,
                    view(orgUnits.group.id),
                    view(periods.group.id),
                    view(newViewGroupId(fake))
                )
            )
        )

        addView(fake.asApi, 'data-selector')

        /* A third of the bar for the new one, the others shrink in proportion */
        expect(orgUnits.group.api.setSize).toHaveBeenLastCalledWith({
            width: 400,
        })
    })

    it('places a clicked selector like any view while the grid is unmeasured', () => {
        const fake = createFakeDockview()
        const [map] = twoColumns(fake)

        addView(fake.asApi, 'period-selector')

        expect(fake.api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({
                position: { referenceGroup: map.group, direction: 'below' },
            })
        )
    })

    it('places a clicked selector like any view when the top has no room for a row', () => {
        const fake = createFakeDockview()
        const map = fake.addLaidOutView('map-a', {
            left: 0,
            top: 0,
            width: 1200,
            height: 250,
        })
        /* A new row needs 96px, which would leave the map below its 160px */
        fake.setLayout(buildTree(1200, 250, row(1, view(map.group.id))))

        addView(fake.asApi, 'period-selector')

        expect(fake.api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({
                position: { referenceGroup: map.group, direction: 'right' },
            })
        )
    })

    it('adds nothing while a view is maximized', () => {
        const fake = createFakeDockview()
        twoColumns(fake)
        fake.setMaximized(true)

        expect(addView(fake.asApi, 'map')).toEqual({ status: 'maximized' })
        expect(fake.api.exitMaximizedGroup).not.toHaveBeenCalled()
        expect(fake.api.addPanel).not.toHaveBeenCalled()
    })

    it('keeps a clicked map out of the selector bar', () => {
        const fake = createFakeDockview()
        fake.addLaidOutView(
            'pe-a',
            { left: 0, top: 0, width: 1000, height: 120 },
            { type: 'period-selector' }
        )
        const map = fake.addLaidOutView('map-a', {
            left: 0,
            top: 120,
            width: 1000,
            height: 580,
        })

        addView(fake.asApi, 'map')

        expect(fake.api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({
                position: { referenceGroup: map.group, direction: 'below' },
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
