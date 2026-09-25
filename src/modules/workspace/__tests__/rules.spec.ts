import { describe, expect, it } from 'vitest'
import { VIEW_MIN_SIZE } from '../grid-tree'
import {
    canAddView,
    getNextViewNumber,
    getSplitAxis,
    hasRoomToInsertLine,
    hasRoomToSplitCell,
    isAllowedDrop,
    isNoOpMove,
    isSwapDrop,
    MAX_VIEWS,
    type DropContext,
} from '../rules'
import { buildTree, column, row, view } from './grid-tree-builders'

describe('canAddView', () => {
    it('allows views up to the maximum', () => {
        expect(canAddView(0)).toBe(true)
        expect(canAddView(MAX_VIEWS - 1)).toBe(true)
        expect(canAddView(MAX_VIEWS)).toBe(false)
    })
})

describe('getNextViewNumber', () => {
    it('starts at 1 for each type', () => {
        expect(getNextViewNumber('map', [])).toBe(1)
        expect(
            getNextViewNumber('visualization', [{ type: 'map', number: 1 }])
        ).toBe(1)
    })

    it('reuses the lowest free number', () => {
        const views = [
            { type: 'map' as const, number: 1 },
            { type: 'map' as const, number: 3 },
        ]
        expect(getNextViewNumber('map', views)).toBe(2)
    })
})

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

    it('swaps a view dropped onto the middle or the tab of another view', () => {
        const swap = {
            ...base,
            source: 'view' as const,
            position: 'center' as const,
        }
        expect(isSwapDrop(swap)).toBe(true)
        expect(isSwapDrop({ ...swap, kind: 'tab' })).toBe(true)
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
    const { width, height } = VIEW_MIN_SIZE

    it('maps drop positions to a split axis', () => {
        expect(getSplitAxis('left')).toBe('horizontal')
        expect(getSplitAxis('right')).toBe('horizontal')
        expect(getSplitAxis('top')).toBe('vertical')
        expect(getSplitAxis('bottom')).toBe('vertical')
        expect(getSplitAxis('center')).toBeNull()
    })

    it('splits a cell only when both halves keep the minimum size', () => {
        expect(hasRoomToSplitCell(width * 2, 'horizontal')).toBe(true)
        expect(hasRoomToSplitCell(width * 2 - 1, 'horizontal')).toBe(false)
        expect(hasRoomToSplitCell(height * 2, 'vertical')).toBe(true)
        expect(hasRoomToSplitCell(height * 2 - 1, 'vertical')).toBe(false)
    })

    it('inserts a line only when every line keeps its minimum size', () => {
        expect(
            hasRoomToInsertLine({
                minLength: width * 2,
                length: width * 3,
                axis: 'horizontal',
            })
        ).toBe(true)
        expect(
            hasRoomToInsertLine({
                minLength: width * 2,
                length: width * 3 - 1,
                axis: 'horizontal',
            })
        ).toBe(false)
        expect(
            hasRoomToInsertLine({
                minLength: height,
                length: height * 2,
                axis: 'vertical',
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
