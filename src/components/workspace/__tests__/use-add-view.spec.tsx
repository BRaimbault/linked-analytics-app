import { useAddView } from '@components/workspace/use-add-view'
import type { ViewType } from '@modules/workspace/view-types'
import { createStore } from '@store/store'
import { viewAdded } from '@store/workspace-slice'
import { act, renderHook } from '@testing-library/react'
import type { DataEngine } from '@types'
import type { DockviewApi } from 'dockview-react'
import type { ReactNode } from 'react'
import { Provider } from 'react-redux'
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

/* The workspace's views: laid out in dockview, and mirrored in the store */
const openViews = (
    fake: ReturnType<typeof createFakeDockview>,
    types: ViewType[]
) => {
    const store = createStore({} as DataEngine)
    types.forEach((type, index) => {
        const id = `${type}-${index}`
        fake.addLaidOutView(
            id,
            { left: 0, top: 0, width: 999, height: 999 },
            { type }
        )
        store.dispatch(viewAdded({ id, type, number: index + 1 }))
    })
    return store
}

const addWith = (
    api: DockviewApi | null,
    type: ViewType = 'map',
    store = createStore({} as DataEngine)
) => {
    const { result } = renderHook(() => useAddView(api), {
        wrapper: ({ children }: { children: ReactNode }) => (
            <Provider store={store}>{children}</Provider>
        ),
    })
    act(() => result.current(type))
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
        const store = openViews(fake, ['map', 'map', 'map', 'map'])

        addWith(fake.asApi, 'map', store)

        expect(show).toHaveBeenCalledWith(
            'A workspace holds up to 4 maps and visualizations'
        )
    })

    it('explains which limit a selector type has reached', () => {
        const fake = createFakeDockview()
        const store = openViews(fake, [
            'map',
            'map',
            'map',
            'map',
            ...Array.from({ length: 4 }, () => 'period-selector' as const),
        ])

        addWith(fake.asApi, 'period-selector', store)

        expect(show).toHaveBeenCalledWith(
            'A workspace holds up to 4 period selectors'
        )
    })

    it('does nothing before the workspace is ready', () => {
        addWith(null)

        expect(show).not.toHaveBeenCalled()
    })
})
