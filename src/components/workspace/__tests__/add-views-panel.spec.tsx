import { AddViewsPanel } from '@components/workspace/panels/add-views-panel'
import { VIEW_DRAG_MIME } from '@modules/workspace/drag-payload'
import { MAX_VIEWS } from '@modules/workspace/rules'
import { viewAdded } from '@store/workspace-slice'
import { act, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DockviewApi } from 'dockview-react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithStore } from './render-with-store'

const createApi = () =>
    ({
        panels: [],
        activeGroup: undefined,
        addPanel: vi.fn(),
    }) as unknown as DockviewApi & { addPanel: ReturnType<typeof vi.fn> }

describe('AddViewsPanel', () => {
    it('puts the view type on the drag payload', () => {
        renderWithStore(<AddViewsPanel />)
        const setData = vi.fn()

        fireEvent.dragStart(screen.getByTestId('add-view-map'), {
            dataTransfer: { setData, effectAllowed: 'none' },
        })

        expect(setData).toHaveBeenCalledWith(
            VIEW_DRAG_MIME,
            JSON.stringify({ type: 'map' })
        )
    })

    it('adds a view on click', async () => {
        const api = createApi()
        renderWithStore(<AddViewsPanel />, { api })

        await userEvent.click(screen.getByTestId('add-view-visualization'))

        expect(api.addPanel).toHaveBeenCalledWith(
            expect.objectContaining({
                component: 'view',
                title: 'Visualization 1',
                params: { type: 'visualization', number: 1 },
            })
        )
    })

    it('disables the tiles once the workspace is full', () => {
        const { store } = renderWithStore(<AddViewsPanel />)
        expect(screen.getByTestId('add-view-map')).toBeEnabled()

        act(() => {
            for (let number = 1; number <= MAX_VIEWS; number++) {
                store.dispatch(
                    viewAdded({ id: `map-${number}`, type: 'map', number })
                )
            }
        })

        expect(screen.getByTestId('add-view-map')).toBeDisabled()
        expect(screen.getByTestId('add-view-visualization')).toBeDisabled()
    })
})
