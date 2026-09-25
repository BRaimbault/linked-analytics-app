import { describe, expect, it } from 'vitest'
import {
    decodeViewDrag,
    encodeViewDrag,
    getDraggedViewType,
    getViewTypeMime,
    VIEW_DRAG_MIME,
} from '../drag-payload'

describe('view drag payload', () => {
    it('round-trips each view type', () => {
        expect(decodeViewDrag(encodeViewDrag('map'))).toBe('map')
        expect(decodeViewDrag(encodeViewDrag('visualization'))).toBe(
            'visualization'
        )
    })

    it('ignores missing, malformed or foreign payloads', () => {
        expect(decodeViewDrag(undefined)).toBeNull()
        expect(decodeViewDrag('')).toBeNull()
        expect(decodeViewDrag('not json')).toBeNull()
        expect(decodeViewDrag('null')).toBeNull()
        expect(decodeViewDrag(JSON.stringify({ type: 'table' }))).toBeNull()
        expect(decodeViewDrag(JSON.stringify(['map']))).toBeNull()
    })

    it('names the dragged type in the drag formats, readable mid-drag', () => {
        expect(
            getDraggedViewType([
                VIEW_DRAG_MIME,
                getViewTypeMime('org-unit-selector'),
            ])
        ).toBe('org-unit-selector')
        expect(getDraggedViewType([VIEW_DRAG_MIME])).toBeNull()
        expect(getDraggedViewType([`${VIEW_DRAG_MIME}-type-table`])).toBeNull()
        expect(getDraggedViewType(undefined)).toBeNull()
    })
})
