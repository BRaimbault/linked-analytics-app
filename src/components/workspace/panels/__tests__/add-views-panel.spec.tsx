import { renderWithStore } from '@components/workspace/__tests__/render-with-store'
import { AddViewsPanel } from '@components/workspace/panels/add-views-panel'
import {
    getViewTypeMime,
    VIEW_DRAG_MIME,
} from '@modules/workspace/drag-payload'
import { MAX_PLUGIN_VIEWS } from '@modules/workspace/view-limits'
import { viewAdded } from '@store/workspace-slice'
import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DockviewApi } from 'dockview-react'
import { describe, expect, it, vi } from 'vitest'
import { panelProps } from './panel-props'

const createApi = () => {
    let maximized = false
    const listeners = new Set<() => void>()
    return {
        panels: [],
        activeGroup: undefined,
        addPanel: vi.fn(),
        hasMaximizedGroup: () => maximized,
        onDidMaximizedGroupChange: (listener: () => void) => {
            listeners.add(listener)
            return { dispose: () => listeners.delete(listener) }
        },
        setMaximized: (value: boolean) => {
            maximized = value
            listeners.forEach((listener) => listener())
        },
        toJSON: () => ({ grid: { root: { type: 'branch', data: [] } } }),
    } as unknown as DockviewApi & {
        addPanel: ReturnType<typeof vi.fn>
        setMaximized: (value: boolean) => void
    }
}

describe('AddViewsPanel', () => {
    it('adds nothing while a view is maximized, and says why', async () => {
        const api = createApi()
        renderWithStore(<AddViewsPanel {...panelProps({})} />, { api })

        act(() => api.setMaximized(true))
        expect(screen.getByTestId('add-view-map')).toBeDisabled()
        await userEvent.hover(screen.getByTestId('add-view-map'))
        expect(await screen.findByRole('tooltip')).toHaveTextContent(
            'Restore the maximized view to add another'
        )

        act(() => api.setMaximized(false))
        expect(screen.getByTestId('add-view-map')).toBeEnabled()
    })

    it('puts the view type on the drag payload', () => {
        renderWithStore(<AddViewsPanel {...panelProps({})} />)
        const setData = vi.fn()

        fireEvent.dragStart(screen.getByTestId('add-view-map'), {
            dataTransfer: { setData, effectAllowed: 'none' },
        })

        expect(setData).toHaveBeenCalledWith(
            VIEW_DRAG_MIME,
            JSON.stringify({ type: 'map' })
        )
        expect(setData).toHaveBeenCalledWith(getViewTypeMime('map'), '')
    })

    it('groups analytics, selectors and notes, each under a heading', () => {
        renderWithStore(<AddViewsPanel {...panelProps({})} />)

        const tilesOf = (name: string) =>
            within(screen.getByRole('region', { name }))
                .getAllByRole('button')
                .map((tile) => tile.textContent)

        expect(tilesOf('Analytics')).toEqual(['Map', 'Visualization'])
        expect(tilesOf('Selectors')).toEqual(['Period', 'Org unit', 'Data'])
        expect(tilesOf('Notes')).toEqual(['Text'])
        expect(
            screen
                .getAllByRole('heading', { level: 2 })
                .map((heading) => heading.textContent)
        ).toEqual(['Analytics', 'Selectors', 'Notes'])
    })

    it('adds a view on click', async () => {
        const api = createApi()
        renderWithStore(<AddViewsPanel {...panelProps({})} />, { api })

        await userEvent.click(screen.getByTestId('add-view-visualization'))

        expect(api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({
                component: 'view',
                title: 'Visualization 1',
                params: { type: 'visualization', number: 1 },
            })
        )
    })

    it('disables the plugin tiles at the limit, but not the selectors', async () => {
        const { store } = renderWithStore(<AddViewsPanel {...panelProps({})} />)
        expect(screen.getByTestId('add-view-map')).toBeEnabled()

        act(() => {
            for (let number = 1; number <= MAX_PLUGIN_VIEWS; number++) {
                store.dispatch(
                    viewAdded({ id: `map-${number}`, type: 'map', number })
                )
            }
        })

        expect(screen.getByTestId('add-view-map')).toBeDisabled()
        expect(screen.getByTestId('add-view-visualization')).toBeDisabled()
        expect(screen.getByTestId('add-view-org-unit-selector')).toBeEnabled()

        await userEvent.hover(screen.getByTestId('add-view-map'))
        expect(
            await screen.findByText(
                'A workspace holds up to 4 maps and visualizations'
            )
        ).toBeInTheDocument()
    })
})
