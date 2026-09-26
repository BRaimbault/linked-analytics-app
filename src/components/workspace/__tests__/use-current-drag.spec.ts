import { useCurrentDrag } from '@components/workspace/use-current-drag'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/* jsdom has no DragEvent with a data transfer, so one is attached */
const dragStart = (types?: string[]) => {
    const event = new Event('dragstart', { bubbles: true })
    Object.defineProperty(event, 'dataTransfer', {
        value: types ? { types } : null,
    })
    document.body.dispatchEvent(event)
}

describe('useCurrentDrag', () => {
    it('holds the drag formats between the start and the end of a drag', () => {
        const { result } = renderHook(() => useCurrentDrag())
        expect(result.current).toBeNull()

        act(() => dragStart(['text/plain']))
        expect(result.current).toEqual(['text/plain'])

        act(() => {
            document.body.dispatchEvent(new Event('dragend', { bubbles: true }))
        })
        expect(result.current).toBeNull()
    })

    it('knows a drag without data, and ends it on drop too', () => {
        const { result } = renderHook(() => useCurrentDrag())

        act(() => dragStart())
        expect(result.current).toEqual([])

        act(() => {
            document.body.dispatchEvent(new Event('drop', { bubbles: true }))
        })
        expect(result.current).toBeNull()
    })
})
