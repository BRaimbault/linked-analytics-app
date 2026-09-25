import { useAddView } from '@components/workspace/use-add-view'
import { act, renderHook } from '@testing-library/react'
import type { DockviewApi } from 'dockview-react'
import { describe, expect, it, vi } from 'vitest'
import { createFakeDockview } from './fake-dockview'

const show = vi.fn()

/* Like the real hook, the alert's message function builds the text shown */
vi.mock('@dhis2/app-runtime', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    useAlert: (message: (props: string) => string) => ({
        show: (props: string) => show(message(props)),
        hide: vi.fn(),
    }),
}))

const addWith = (api: DockviewApi | null) => {
    const { result } = renderHook(() => useAddView(api))
    act(() => result.current('map'))
}

describe('useAddView', () => {
    it('adds a view without any alert', () => {
        const fake = createFakeDockview()

        addWith(fake.asApi)

        expect(fake.api.addPanel).toHaveBeenCalled()
        expect(show).not.toHaveBeenCalled()
    })

    it('explains when there is no room left', () => {
        const fake = createFakeDockview()
        fake.addLaidOutView('small', {
            left: 0,
            top: 0,
            width: 300,
            height: 300,
        })

        addWith(fake.asApi)

        expect(show).toHaveBeenCalledWith(
            'There is no room for another view. Make the window larger, or close or resize a view.'
        )
    })

    it('explains when the workspace is full', () => {
        const fake = createFakeDockview()
        for (const id of ['a', 'b', 'c', 'd']) {
            fake.addLaidOutView(id, {
                left: 0,
                top: 0,
                width: 999,
                height: 999,
            })
        }

        addWith(fake.asApi)

        expect(show).toHaveBeenCalledWith(
            'A workspace holds up to 4 maps and visualizations'
        )
    })

    it('does nothing before the workspace is ready', () => {
        addWith(null)

        expect(show).not.toHaveBeenCalled()
    })
})
