import {
    endTileDrag,
    getDraggedTile,
    startTileDrag,
} from '@components/workspace/controller/tile-drag'
import { afterEach, describe, expect, it, vi } from 'vitest'

const fire = (type: 'dragend' | 'drop') =>
    document.body.dispatchEvent(new Event(type, { bubbles: true }))

describe('tile drag', () => {
    afterEach(() => {
        endTileDrag()
        vi.useRealTimers()
    })

    it('knows the dragged tile until the drag ends', () => {
        expect(getDraggedTile()).toBeNull()

        startTileDrag('map')
        expect(getDraggedTile()).toBe('map')

        fire('dragend')
        expect(getDraggedTile()).toBeNull()
    })

    it('keeps the tile for the drop handlers, then forgets it', () => {
        vi.useFakeTimers()
        startTileDrag('visualization')

        fire('drop')
        expect(getDraggedTile()).toBe('visualization')

        vi.runAllTimers()
        expect(getDraggedTile()).toBeNull()
    })

    it('follows a new drag, which no earlier drop ends', () => {
        vi.useFakeTimers()
        startTileDrag('map')
        fire('drop')

        startTileDrag('text')
        vi.runAllTimers()

        expect(getDraggedTile()).toBe('text')
    })
})
