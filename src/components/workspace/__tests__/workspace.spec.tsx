import { Workspace } from '@components/workspace/workspace'
import { selectActiveView, selectViews } from '@store/workspace-slice'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { renderWithStore } from './render-with-store'

/* jsdom has no layout, so dockview would measure a 0x0 container */
beforeAll(() => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(800)
})

afterAll(() => {
    vi.restoreAllMocks()
})

const renderWorkspace = async () => {
    const view = renderWithStore(<Workspace />)
    await screen.findByRole('tab', { name: 'Add views' })
    return view
}

describe('Workspace', () => {
    it('starts with the tool tabs and an empty grid', async () => {
        await renderWorkspace()

        expect(
            screen.getByRole('tab', { name: 'Interactions' })
        ).toBeInTheDocument()
        expect(screen.getByTestId('workspace-watermark')).toBeInTheDocument()
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

    it('keeps the tools strip collapsed when it moves to another edge', async () => {
        await renderWorkspace()
        await userEvent.click(screen.getByTestId('collapse-tools-button'))
        await userEvent.click(screen.getByTestId('move-tools-button'))
        await userEvent.click(await screen.findByTestId('move-tools-left'))

        await waitFor(() =>
            expect(
                screen.getByTestId('collapse-tools-button')
            ).toHaveAccessibleName('Expand')
        )
    })

    it('swaps two views from the view menu, keeping their settings', async () => {
        const { store } = await renderWorkspace()
        await userEvent.click(screen.getByTestId('add-view-map'))
        await userEvent.click(screen.getByTestId('add-view-visualization'))
        const viewsBefore = selectViews(store.getState())

        /* The same DOM nodes before and after: the views were moved, not
         * rebuilt, which is what will keep a plugin's iframe from reloading */
        const placeholdersBefore = screen.getAllByTestId('view-placeholder')

        const mapTab = screen.getByRole('tab', { name: 'Map 1' })
        const mapCell = mapTab.closest('.dv-groupview') as HTMLElement
        await userEvent.click(
            within(mapCell).getByTestId('view-actions-button')
        )
        await userEvent.click(
            await screen.findByText('Swap with Visualization 1')
        )

        const groupTitles = () =>
            [...document.querySelectorAll('.dv-groupview')]
                .map((group) => group.querySelector('.dv-tab')?.textContent)
                .filter(
                    (title) => title === 'Map 1' || title === 'Visualization 1'
                )
        await waitFor(() =>
            expect(groupTitles()).toEqual(['Visualization 1', 'Map 1'])
        )
        const placeholdersAfter = screen.getAllByTestId('view-placeholder')
        expect(placeholdersAfter).toHaveLength(2)
        placeholdersBefore.forEach((placeholder) =>
            expect(placeholdersAfter).toContain(placeholder)
        )
        expect(selectViews(store.getState())).toEqual(viewsBefore)
        expect(
            screen.getByRole('tab', { name: 'Map 1 settings' })
        ).toHaveAttribute('aria-selected', 'true')
        expect(
            screen.getByRole('tab', { name: 'Visualization 1 settings' })
        ).toBeInTheDocument()
    })

    it('collapses and expands the tools strip', async () => {
        await renderWorkspace()
        const toggle = screen.getByTestId('collapse-tools-button')
        expect(toggle).toHaveAccessibleName('Collapse')

        await userEvent.click(toggle)
        await waitFor(() =>
            expect(
                screen.getByTestId('collapse-tools-button')
            ).toHaveAccessibleName('Expand')
        )

        await userEvent.click(screen.getByTestId('collapse-tools-button'))
        await waitFor(() =>
            expect(
                screen.getByTestId('collapse-tools-button')
            ).toHaveAccessibleName('Collapse')
        )
    })

    it('maximizes and restores a view', async () => {
        await renderWorkspace()
        await userEvent.click(screen.getByTestId('add-view-map'))
        await userEvent.click(screen.getByTestId('add-view-map'))

        const [maximize] = await screen.findAllByTestId('maximize-view-button')
        await userEvent.click(maximize)
        await waitFor(() =>
            expect(
                screen.getAllByRole('button', { name: 'Restore' })
            ).toHaveLength(1)
        )

        await userEvent.click(screen.getByRole('button', { name: 'Restore' }))
        await waitFor(() =>
            expect(screen.queryByRole('button', { name: 'Restore' })).toBeNull()
        )
    })
})
