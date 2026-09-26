import { describe, expect, it } from 'vitest'
import {
    getInsertZones,
    INSERT_ZONE_THICKNESS,
    OUTER_ZONE_THICKNESS,
    VIEW_HEADER_HEIGHT,
    type InsertZone,
} from '../insert-zones'
import { getViewTypeSizes } from '../view-types'
import { buildTree, column, row, view } from './grid-tree-builders'

const half = INSERT_ZONE_THICKNESS / 2

const betweenLines = (zones: InsertZone[]) =>
    zones.filter((zone) => zone.referenceId !== null)

const outerEdges = (zones: InsertZone[]) =>
    zones
        .filter((zone) => zone.referenceId === null)
        .map((zone) => zone.position)

const references = (zones: InsertZone[]) =>
    betweenLines(zones).map(
        ({ referenceId, position }) => `${referenceId}:${position}`
    )

describe('getInsertZones', () => {
    it('offers a strip over each divider between lines', () => {
        const zones = betweenLines(
            getInsertZones(
                buildTree(1200, 800, row(1, view('a'), view('b'), view('c')))
            )
        )

        expect(zones).toEqual([
            {
                axis: 'horizontal',
                referenceId: 'a',
                position: 'right',
                rect: { left: 400 - half, top: 0, width: 24, height: 800 },
            },
            {
                axis: 'horizontal',
                referenceId: 'b',
                position: 'right',
                rect: { left: 800 - half, top: 0, width: 24, height: 800 },
            },
        ])
    })

    it('offers the dividers within a stack, across its own width', () => {
        const zones = getInsertZones(
            buildTree(
                1200,
                800,
                row(1, view('a'), column(1, view('b'), view('c')))
            ),
            { thickness: 10 }
        )

        expect(betweenLines(zones)[1]).toEqual({
            axis: 'vertical',
            referenceId: 'b',
            position: 'bottom',
            rect: { left: 600, top: 395, width: 600, height: 5 + 35 },
        })
    })

    it('reaches down over the headers below a divider, for a tab dropped there', () => {
        const zones = getInsertZones(
            buildTree(1200, 800, column(1, view('a'), view('b')))
        )

        expect(betweenLines(zones)[0]?.rect).toEqual({
            left: 0,
            top: 400 - half,
            width: 1200,
            height: half + VIEW_HEADER_HEIGHT,
        })
        expect(
            betweenLines(
                getInsertZones(
                    buildTree(1200, 800, column(1, view('a'), view('b'))),
                    { headerHeight: 0 }
                )
            )[0]?.rect.height
        ).toBe(INSERT_ZONE_THICKNESS)
    })

    it('leaves out the dividers next to the dragged view', () => {
        const layout = buildTree(
            1200,
            800,
            row(1, view('a'), view('b'), view('c'))
        )

        expect(references(getInsertZones(layout, { sourceId: 'b' }))).toEqual(
            []
        )
        expect(references(getInsertZones(layout, { sourceId: 'a' }))).toEqual([
            'b:right',
        ])
    })

    it('places next to what is left of a pair the dragged view leaves', () => {
        const layout = buildTree(
            1200,
            800,
            row(1, column(1, view('a'), view('s')), view('b'))
        )
        const flipped = buildTree(
            1200,
            800,
            row(1, column(1, view('s'), view('a')), view('b'))
        )

        expect(references(getInsertZones(layout, { sourceId: 's' }))).toEqual([
            'a:right',
        ])
        expect(references(getInsertZones(flipped, { sourceId: 's' }))).toEqual([
            'a:right',
        ])
    })

    it('places next to the view after the divider when the one before is a stack', () => {
        const layout = buildTree(
            1200,
            800,
            row(1, column(1, view('a'), view('b'), view('d')), view('c'))
        )

        expect(references(getInsertZones(layout))).toEqual([
            'c:left',
            'a:bottom',
            'b:bottom',
        ])
    })

    it('places below the view before a row divider, or above the one after', () => {
        const layout = buildTree(
            1200,
            800,
            column(1, row(1, view('a'), view('b')), view('c'))
        )

        expect(references(getInsertZones(layout))).toEqual(['c:top', 'a:right'])
    })

    it('offers nothing between two stacks, which only happens in a full grid', () => {
        const layout = buildTree(
            1200,
            800,
            row(
                1,
                column(1, view('a'), view('b')),
                column(1, view('c'), view('d'))
            )
        )

        expect(references(getInsertZones(layout))).toEqual([
            'a:bottom',
            'c:bottom',
        ])
    })

    it('offers nothing where a new line would not fit', () => {
        const layout = buildTree(600, 800, row(1, view('a'), view('b')))

        expect(betweenLines(getInsertZones(layout))).toEqual([])
    })

    it('offers a strip along each outer edge of the grid', () => {
        const zones = getInsertZones(
            buildTree(1200, 800, row(1, view('a'), view('b')))
        )
        const t = OUTER_ZONE_THICKNESS

        expect(zones.filter((zone) => zone.referenceId === null)).toEqual([
            {
                axis: 'horizontal',
                position: 'left',
                referenceId: null,
                rect: { left: 0, top: 0, width: t, height: 800 },
            },
            {
                axis: 'horizontal',
                position: 'right',
                referenceId: null,
                rect: { left: 1200 - t, top: 0, width: t, height: 800 },
            },
            {
                axis: 'vertical',
                position: 'top',
                referenceId: null,
                rect: {
                    left: 0,
                    top: 0,
                    width: 1200,
                    height: t,
                },
            },
            {
                axis: 'vertical',
                position: 'bottom',
                referenceId: null,
                rect: { left: 0, top: 800 - t, width: 1200, height: t },
            },
        ])
    })

    it('leaves out the outer edge a dragged view already runs along', () => {
        const layout = buildTree(1200, 800, row(1, view('a'), view('b')))

        expect(outerEdges(getInsertZones(layout, { sourceId: 'a' }))).toEqual([
            'right',
            'top',
            'bottom',
        ])
    })

    it('leaves out outer edges without room for another line', () => {
        const layout = buildTree(700, 800, row(1, view('a'), view('b')))

        expect(outerEdges(getInsertZones(layout))).toEqual(['top', 'bottom'])
        expect(outerEdges(getInsertZones(layout, { sourceId: 'a' }))).toEqual([
            'right',
            'top',
            'bottom',
        ])
    })

    it('offers nothing on an empty grid, which takes a view anywhere', () => {
        expect(getInsertZones(buildTree(1200, 800, row(1)))).toEqual([])
    })

    it('offers a selector a line where a plugin would not fit', () => {
        /* Two plugin rows need 320px; a selector row only 96px more */
        const layout = buildTree(1200, 300, row(1, view('a'), view('b')))

        expect(outerEdges(getInsertZones(layout))).toEqual(['left', 'right'])
        expect(
            outerEdges(
                getInsertZones(layout, {
                    placedSizes: getViewTypeSizes('org-unit-selector'),
                })
            )
        ).toEqual(['left', 'right', 'top', 'bottom'])
    })
})
