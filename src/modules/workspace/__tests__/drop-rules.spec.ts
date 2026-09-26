import { describe, expect, it } from 'vitest'
import {
    getSplitAxis,
    hasRoomToInsertLine,
    hasRoomToSplitCell,
    isAllowedDrop,
    isNoOpMove,
    isSwapDrop,
    type DropContext,
} from '../drop-rules'
import { PLUGIN_SIZES } from '../grid-tree'
import { buildTree, column, row, view } from './grid-tree-builders'

describe('isAllowedDrop', () => {
    const base: DropContext = {
        kind: 'content',
        position: 'right',
        targetIsEdgeGroup: false,
        targetHoldsSource: false,
        source: 'external',
        gridIsEmpty: false,
        isNoOpMove: false,
    }

    it('lets a new view split an existing one', () => {
        for (const position of ['top', 'bottom', 'left', 'right'] as const) {
            expect(isAllowedDrop({ ...base, position })).toBe(true)
        }
    })

    it('lets a view dock at the outer edges of the grid', () => {
        expect(isAllowedDrop({ ...base, kind: 'edge', position: 'left' })).toBe(
            true
        )
    })

    it('swaps a view dropped onto the middle of another view, not its tab', () => {
        const swap = {
            ...base,
            source: 'view' as const,
            position: 'center' as const,
        }
        expect(isSwapDrop(swap)).toBe(true)
        expect(isSwapDrop({ ...swap, kind: 'tab' })).toBe(false)
        expect(isAllowedDrop(swap)).toBe(true)
    })

    it('does not swap a view with itself, with the tools, or from the palette', () => {
        const swap = {
            ...base,
            source: 'view' as const,
            position: 'center' as const,
        }
        expect(isSwapDrop({ ...swap, targetHoldsSource: true })).toBe(false)
        expect(isAllowedDrop({ ...swap, targetHoldsSource: true })).toBe(false)
        expect(isSwapDrop({ ...swap, targetIsEdgeGroup: true })).toBe(false)
        expect(isSwapDrop({ ...swap, source: 'external' })).toBe(false)
        expect(isSwapDrop({ ...swap, kind: 'header_space' })).toBe(false)
        expect(isSwapDrop({ ...swap, position: 'left' })).toBe(false)
    })

    it('refuses drops that would turn a view into a tab', () => {
        expect(isAllowedDrop({ ...base, position: 'center' })).toBe(false)
        expect(
            isAllowedDrop({ ...base, kind: 'tab', position: 'center' })
        ).toBe(false)
        expect(
            isAllowedDrop({ ...base, kind: 'header_space', position: 'center' })
        ).toBe(false)
    })

    it('fills an empty grid through its centre', () => {
        expect(
            isAllowedDrop({
                ...base,
                kind: 'edge',
                position: 'center',
                gridIsEmpty: true,
            })
        ).toBe(true)
    })

    it('offers no drop that would leave the layout as it is', () => {
        expect(
            isAllowedDrop({ ...base, source: 'view', isNoOpMove: true })
        ).toBe(false)
    })

    it('keeps views out of the tool edge groups', () => {
        for (const source of ['external', 'view'] as const) {
            expect(
                isAllowedDrop({ ...base, source, targetIsEdgeGroup: true })
            ).toBe(false)
        }
    })

    it('keeps tools out of the grid but lets them move within edge groups', () => {
        expect(isAllowedDrop({ ...base, source: 'tool' })).toBe(false)
        expect(
            isAllowedDrop({
                ...base,
                source: 'tool',
                kind: 'tab',
                position: 'center',
                targetIsEdgeGroup: true,
            })
        ).toBe(true)
    })
})

describe('room to split', () => {
    const { width, height } = PLUGIN_SIZES.min

    it('maps drop positions to a split axis', () => {
        expect(getSplitAxis('left')).toBe('horizontal')
        expect(getSplitAxis('right')).toBe('horizontal')
        expect(getSplitAxis('top')).toBe('vertical')
        expect(getSplitAxis('bottom')).toBe('vertical')
        expect(getSplitAxis('center')).toBeNull()
    })

    it('halves a cell only when both halves keep their minimum size', () => {
        const halving = { targetMin: width, placedMin: width, halves: true }

        expect(hasRoomToSplitCell({ ...halving, length: width * 2 })).toBe(true)
        expect(hasRoomToSplitCell({ ...halving, length: width * 2 - 1 })).toBe(
            false
        )
        /* The larger minimum decides: a plugin halving a selector's cell */
        expect(
            hasRoomToSplitCell({
                length: height * 2 - 1,
                targetMin: 96,
                placedMin: height,
                halves: true,
            })
        ).toBe(false)
    })

    it('fits a selector next to a view when both keep their minimum', () => {
        const selectorSplit = {
            targetMin: height,
            placedMin: 96,
            halves: false,
        }

        expect(
            hasRoomToSplitCell({ ...selectorSplit, length: height + 96 })
        ).toBe(true)
        expect(
            hasRoomToSplitCell({ ...selectorSplit, length: height + 95 })
        ).toBe(false)
    })

    it('inserts a line only when every line keeps its minimum size', () => {
        expect(
            hasRoomToInsertLine({
                minLength: width * 2,
                length: width * 3,
                placedMin: width,
            })
        ).toBe(true)
        expect(
            hasRoomToInsertLine({
                minLength: width * 2,
                length: width * 3 - 1,
                placedMin: width,
            })
        ).toBe(false)
        expect(
            hasRoomToInsertLine({
                minLength: height,
                length: height * 2,
                placedMin: height,
            })
        ).toBe(true)
        /* A selector needs less room than a plugin */
        expect(
            hasRoomToInsertLine({
                minLength: height,
                length: height + 96,
                placedMin: 96,
            })
        ).toBe(true)
    })
})

describe('isNoOpMove', () => {
    /* a | (b over c) */
    const layout = buildTree(
        1200,
        800,
        row(1, view('a'), column(1, view('b'), view('c')))
    )

    it('refuses a view its own cell', () => {
        for (const position of ['left', 'center', 'bottom'] as const) {
            expect(
                isNoOpMove(layout, 'b', { type: 'cell', id: 'b', position })
            ).toBe(true)
        }
    })

    it('refuses the edge of the neighbour facing the view', () => {
        expect(
            isNoOpMove(layout, 'b', {
                type: 'cell',
                id: 'c',
                position: 'top',
            })
        ).toBe(true)
        expect(
            isNoOpMove(layout, 'c', {
                type: 'cell',
                id: 'b',
                position: 'bottom',
            })
        ).toBe(true)
    })

    it('allows the other edges of a neighbour', () => {
        expect(
            isNoOpMove(layout, 'b', {
                type: 'cell',
                id: 'c',
                position: 'bottom',
            })
        ).toBe(false)
        expect(
            isNoOpMove(layout, 'b', {
                type: 'cell',
                id: 'c',
                position: 'left',
            })
        ).toBe(false)
        expect(
            isNoOpMove(layout, 'b', {
                type: 'cell',
                id: 'a',
                position: 'right',
            })
        ).toBe(false)
    })

    it('refuses the outer edge a view already runs along', () => {
        expect(
            isNoOpMove(layout, 'a', { type: 'edge', position: 'left' })
        ).toBe(true)
        expect(
            isNoOpMove(layout, 'a', { type: 'edge', position: 'right' })
        ).toBe(false)
        expect(isNoOpMove(layout, 'a', { type: 'edge', position: 'top' })).toBe(
            false
        )
        expect(
            isNoOpMove(layout, 'c', { type: 'edge', position: 'bottom' })
        ).toBe(false)
    })

    it('lets a short row spanning part of the grid move to the top or bottom', () => {
        /* map 1 | ((vis 2 | vis 1) over map 2) */
        const capture = buildTree(
            1200,
            800,
            row(
                1,
                view('map-1'),
                column(
                    1,
                    row(4, view('vis-2'), view('vis-1')),
                    view('map-2', 1)
                )
            )
        )

        for (const position of ['top', 'bottom'] as const) {
            expect(
                isNoOpMove(capture, 'map-2', { type: 'edge', position })
            ).toBe(false)
        }
    })

    it('refuses every move of the only view', () => {
        const single = buildTree(1200, 800, row(1, view('a')))

        expect(
            isNoOpMove(single, 'a', { type: 'edge', position: 'bottom' })
        ).toBe(true)
    })

    it('does not judge swaps or unknown views', () => {
        expect(
            isNoOpMove(layout, 'b', {
                type: 'cell',
                id: 'a',
                position: 'center',
            })
        ).toBe(false)
        expect(
            isNoOpMove(layout, 'gone', { type: 'edge', position: 'left' })
        ).toBe(false)
    })
})
