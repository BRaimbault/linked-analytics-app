import { useCurrentDrag } from '@components/workspace/use-current-drag'
import { VIEW_DRAG_MIME } from '@modules/workspace/drag-payload'
import { act, renderHook } from '@testing-library/react'
import type * as dockview from 'dockview-react'
import { getPanelData } from 'dockview-react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('dockview-react', async (importOriginal) => ({
    ...(await importOriginal<typeof dockview>()),
    getPanelData: vi.fn(),
}))

/* jsdom has no DragEvent with a data transfer, so one is attached */
const dragStart = (types?: string[], init: EventInit = {}) => {
    const event = new Event('dragstart', { bubbles: true, ...init })
    Object.defineProperty(event, 'dataTransfer', {
        value: types ? { types } : null,
    })
    document.body.dispatchEvent(event)
}

const fire = (type: 'dragend' | 'drop') =>
    document.body.dispatchEvent(new Event(type, { bubbles: true }))

describe('useCurrentDrag', () => {
    it('holds a palette drag’s formats between its start and its end', () => {
        const { result } = renderHook(() => useCurrentDrag())
        expect(result.current).toBeNull()

        act(() => dragStart([VIEW_DRAG_MIME]))
        expect(result.current).toEqual([VIEW_DRAG_MIME])

        act(() => fire('dragend'))
        expect(result.current).toBeNull()
    })

    it('knows a tab dockview drags, and ends it on drop too', () => {
        vi.mocked(getPanelData).mockReturnValue({
            viewId: 'dockview',
            groupId: 'group-a',
            panelId: 'map-a',
        } as ReturnType<typeof getPanelData>)
        const { result } = renderHook(() => useCurrentDrag())

        act(() => dragStart(['text/plain']))
        expect(result.current).toEqual(['text/plain'])

        act(() => fire('drop'))
        expect(result.current).toBeNull()

        /* A touch drag, which dockview runs itself, has no data transfer */
        act(() => dragStart())
        expect(result.current).toEqual([])
        /* clearMocks keeps a mocked return value */
        vi.mocked(getPanelData).mockReset()
    })

    it('leaves alone a drag that isn’t the workspace’s, like text in a note', () => {
        const { result } = renderHook(() => useCurrentDrag())

        act(() => dragStart(['text/plain']))
        act(() => dragStart())

        expect(result.current).toBeNull()
    })

    it('ignores a drag cancelled as it starts, which never ends', () => {
        const { result } = renderHook(() => useCurrentDrag())
        const cancel = (event: Event) => event.preventDefault()
        document.addEventListener('dragstart', cancel, true)

        act(() => dragStart([VIEW_DRAG_MIME], { cancelable: true }))

        document.removeEventListener('dragstart', cancel, true)
        expect(result.current).toBeNull()
    })
})
