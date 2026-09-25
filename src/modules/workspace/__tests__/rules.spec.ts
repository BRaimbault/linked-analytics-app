import { describe, expect, it } from 'vitest'
import {
    canAddView,
    getEdgeDockLength,
    getNextViewNumber,
    getSplitAxis,
    hasRoomToDockAtEdge,
    hasRoomToSplitCell,
    isAllowedDrop,
    isSwapDrop,
    MAX_VIEWS,
    VIEW_MIN_SIZE,
    type DropContext,
} from '../rules'

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

    it('docks at the grid edge only when the narrowest line stays readable', () => {
        // two columns, the narrowest shrinking to 2/3 of its width
        expect(hasRoomToDockAtEdge(width * 1.5, 2, 'horizontal')).toBe(true)
        expect(hasRoomToDockAtEdge(width * 1.4, 2, 'horizontal')).toBe(false)
        // a single full-height row halves when a second one docks below
        expect(hasRoomToDockAtEdge(height * 2, 1, 'vertical')).toBe(true)
    })
})

describe('getEdgeDockLength', () => {
    it('gives a view docked at the outer edge its share of the grid', () => {
        expect(getEdgeDockLength(720, 3)).toBe(240)
        expect(getEdgeDockLength(1280, 4)).toBe(320)
    })

    it('never divides by zero', () => {
        expect(getEdgeDockLength(900, 0)).toBe(900)
    })
})
