import { getOuterEdgeDropModel } from '@components/workspace/workspace'
import {
    getViewTypeMime,
    VIEW_DRAG_MIME,
} from '@modules/workspace/drag-payload'
import { selectActiveView, selectViews } from '@store/workspace-slice'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { mockContainerSize, renderWorkspace } from './render-workspace'

mockContainerSize()

describe('Workspace', () => {
    it('starts with the palette alone and an empty grid', async () => {
        await renderWorkspace()

        expect(
            screen.getAllByRole('tab').map((tab) => tab.textContent)
        ).toEqual(['Add views'])
        expect(screen.getByTestId('workspace-watermark')).toBeInTheDocument()
    })

    it('marks the workspace while something is dragged', async () => {
        await renderWorkspace()
        const workspace = screen.getByTestId('workspace')

        fireEvent.dragStart(screen.getByTestId('add-view-map'), {
            dataTransfer: { setData: vi.fn(), types: [] },
        })
        expect(workspace).toHaveAttribute('data-dragging')

        fireEvent.dragEnd(screen.getByTestId('add-view-map'))
        expect(workspace).not.toHaveAttribute('data-dragging')
    })

    it('adds a view from the palette and mirrors it in the store', async () => {
        const { store } = await renderWorkspace()

        await userEvent.click(screen.getByTestId('add-view-map'))

        expect(
            await screen.findByRole('tab', { name: 'Map 1' })
        ).toBeInTheDocument()
        expect(screen.getByTestId('view-placeholder')).toBeInTheDocument()
        await waitFor(() =>
            expect(selectViews(store.getState())).toEqual([
                expect.objectContaining({ type: 'map', number: 1 }),
            ])
        )
    })

    it('takes a view dragged from the palette onto the empty grid', async () => {
        await renderWorkspace()
        const watermark = screen.getByTestId('workspace-watermark')
        const palette = {
            types: [VIEW_DRAG_MIME, getViewTypeMime('map')],
            getData: () => JSON.stringify({ type: 'map' }),
        }

        fireEvent.dragOver(watermark, { dataTransfer: { types: ['Files'] } })
        expect(watermark).not.toHaveAttribute('data-drop-target')

        fireEvent.dragOver(watermark, { dataTransfer: palette })
        expect(watermark).toHaveAttribute('data-drop-target')

        /* jsdom has no DragEvent, which would carry where the pointer went */
        const leaveTo = (relatedTarget: Element | null) =>
            act(() => {
                watermark.dispatchEvent(
                    new MouseEvent('dragleave', {
                        bubbles: true,
                        relatedTarget,
                    })
                )
            })
        leaveTo(watermark.firstElementChild)
        expect(watermark).toHaveAttribute('data-drop-target')
        leaveTo(null)
        expect(watermark).not.toHaveAttribute('data-drop-target')

        fireEvent.drop(watermark, { dataTransfer: palette })

        expect(
            await screen.findByRole('tab', { name: 'Map 1' })
        ).toBeInTheDocument()
    })

    it('ignores a drop on the empty grid without a view payload', async () => {
        await renderWorkspace()

        fireEvent.drop(screen.getByTestId('workspace-watermark'), {
            dataTransfer: { types: [], getData: () => '' },
        })

        expect(screen.getByTestId('workspace-watermark')).toBeInTheDocument()
    })

    it('adds a view from the empty-grid buttons', async () => {
        await renderWorkspace()

        await userEvent.click(screen.getByTestId('watermark-add-visualization'))

        expect(
            await screen.findByRole('tab', { name: 'Visualization 1' })
        ).toBeInTheDocument()
    })

    it('gives each view its own settings tab, removed with the view', async () => {
        await renderWorkspace()
        await userEvent.click(screen.getByTestId('add-view-map'))
        await userEvent.click(screen.getByTestId('add-view-visualization'))

        expect(
            await screen.findByRole('tab', { name: 'Map 1 settings' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('tab', { name: 'Visualization 1 settings' })
        ).toBeInTheDocument()

        const mapTab = screen.getByRole('tab', { name: 'Map 1' })
        await userEvent.click(
            within(mapTab).getByRole('button', { name: 'Close tab' })
        )

        await waitFor(() =>
            expect(
                screen.queryByRole('tab', { name: 'Map 1 settings' })
            ).toBeNull()
        )
    })

    it('closes a view from its settings tab', async () => {
        await renderWorkspace()
        await userEvent.click(screen.getByTestId('add-view-map'))
        const settingsTab = await screen.findByRole('tab', {
            name: 'Map 1 settings',
        })

        expect(
            within(screen.getByRole('tab', { name: 'Add views' })).queryByRole(
                'button',
                { name: 'Close tab' }
            )
        ).toBeNull()
        await userEvent.click(
            within(settingsTab).getByRole('button', { name: 'Close tab' })
        )

        await waitFor(() =>
            expect(screen.queryByRole('tab', { name: 'Map 1' })).toBeNull()
        )
        expect(screen.queryByRole('tab', { name: 'Map 1 settings' })).toBeNull()
        expect(screen.getByTestId('workspace-watermark')).toBeInTheDocument()
    })

    it('shows the settings of a view the user selects, but keeps the palette after adding', async () => {
        await renderWorkspace()
        await userEvent.click(screen.getByTestId('add-view-map'))
        await userEvent.click(screen.getByTestId('add-view-visualization'))

        expect(screen.getByRole('tab', { name: 'Add views' })).toHaveAttribute(
            'aria-selected',
            'true'
        )

        await userEvent.click(screen.getByRole('tab', { name: 'Map 1' }))

        await waitFor(() =>
            expect(
                screen.getByRole('tab', { name: 'Map 1 settings' })
            ).toHaveAttribute('aria-selected', 'true')
        )
        expect(screen.getByTestId('selected-view-tab')).toHaveTextContent(
            'Map 1'
        )
    })

    it('opens the settings of a view from its placeholder', async () => {
        const { store } = await renderWorkspace()
        await userEvent.click(screen.getByTestId('add-view-map'))
        await userEvent.click(screen.getByTestId('add-view-visualization'))

        const [mapEditButton] =
            await screen.findAllByTestId('edit-view-settings')
        await userEvent.click(mapEditButton)

        await waitFor(() =>
            expect(selectActiveView(store.getState())).toEqual(
                expect.objectContaining({ type: 'map', number: 1 })
            )
        )
        expect(
            screen.getByRole('tab', { name: 'Map 1 settings' })
        ).toHaveAttribute('aria-selected', 'true')
        expect(screen.getByTestId('selected-view-tab')).toHaveTextContent(
            'Map 1'
        )
    })

    it('selects a neighbour when the selected view is closed', async () => {
        const { store } = await renderWorkspace()
        await userEvent.click(screen.getByTestId('add-view-map'))
        await userEvent.click(screen.getByTestId('add-view-visualization'))
        await userEvent.click(
            screen.getByRole('tab', { name: 'Visualization 1' })
        )

        await userEvent.click(
            within(
                screen.getByRole('tab', { name: 'Visualization 1' })
            ).getByRole('button', { name: 'Close tab' })
        )

        await waitFor(() =>
            expect(selectActiveView(store.getState())).toEqual(
                expect.objectContaining({ type: 'map', number: 1 })
            )
        )
        expect(
            screen.getByRole('tab', { name: 'Map 1 settings' })
        ).toHaveAttribute('aria-selected', 'true')
    })

    it('goes back to the palette when the last view is closed', async () => {
        await renderWorkspace()
        await userEvent.click(screen.getByTestId('add-view-map'))
        await userEvent.click(screen.getByRole('tab', { name: 'Map 1' }))
        expect(
            screen.getByRole('tab', { name: 'Map 1 settings' })
        ).toHaveAttribute('aria-selected', 'true')

        await userEvent.click(
            within(screen.getByRole('tab', { name: 'Map 1' })).getByRole(
                'button',
                { name: 'Close tab' }
            )
        )

        await waitFor(() =>
            expect(
                screen.getByRole('tab', { name: 'Add views' })
            ).toHaveAttribute('aria-selected', 'true')
        )
    })
})

describe('getOuterEdgeDropModel', () => {
    const pointer = (primary: 'coarse' | 'fine') =>
        vi.stubGlobal('matchMedia', (query: string) => ({
            matches: query === `(pointer: ${primary})`,
        }))

    it('keeps dockview’s outer edges on a touch screen, where drags use pointer events', () => {
        pointer('coarse')

        expect(getOuterEdgeDropModel()).toEqual(
            expect.objectContaining({ activationSize: expect.any(Object) })
        )
    })

    it('leaves the outer edges to the insert zones for a mouse, or without media queries', () => {
        pointer('fine')
        expect(getOuterEdgeDropModel()).toBe(false)

        vi.stubGlobal('matchMedia', undefined)
        expect(getOuterEdgeDropModel()).toBe(false)
    })
})
