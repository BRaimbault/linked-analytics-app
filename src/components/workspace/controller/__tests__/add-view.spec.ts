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

    it('starts a bar of selectors across the top for a clicked selector', () => {
        const fake = createFakeDockview()
        const [map, vis] = twoColumns(fake)
        fake.setLayout(
            buildTree(1000, 800, row(1, view(map.group.id), view(vis.group.id)))
        )

        addView(fake.asApi, 'period-selector', { nextToViewId: map.id })

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

        addView(fake.asApi, 'period-selector', { nextToViewId: map.id })

        expect(fake.api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({
                position: { referenceGroup: map.group, direction: 'right' },
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
