import { useIsDragging } from '@components/workspace/use-is-dragging'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('useIsDragging', () => {
    it('is true between the start and the end of a drag', () => {
        const { result } = renderHook(() => useIsDragging())
        expect(result.current).toBe(false)

        act(() => {
            document.body.dispatchEvent(
                new Event('dragstart', { bubbles: true })
            )
        })
        expect(result.current).toBe(true)

        act(() => {
            document.body.dispatchEvent(new Event('dragend', { bubbles: true }))
        })
        expect(result.current).toBe(false)
    })

    it('also ends on drop, in case the source never fires dragend', () => {
        const { result } = renderHook(() => useIsDragging())
        act(() => {
            document.body.dispatchEvent(
                new Event('dragstart', { bubbles: true })
            )
            document.body.dispatchEvent(new Event('drop', { bubbles: true }))
        })
        expect(result.current).toBe(false)
    })
})
