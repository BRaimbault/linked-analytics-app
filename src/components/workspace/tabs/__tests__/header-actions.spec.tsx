import {
    mockContainerSize,
    renderWorkspace,
    toolsStrip,
    viewsGrid,
} from '@components/workspace/__tests__/render-workspace'
import { selectActiveView, selectViews } from '@store/workspace-slice'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

mockContainerSize()

describe('header actions', () => {
    it('moves the tools strip to another edge and back, staying collapsed', async () => {
        await renderWorkspace()
        await userEvent.click(screen.getByTestId('collapse-tools-button'))

        await userEvent.click(screen.getByTestId('move-tools-button'))
        await userEvent.click(await screen.findByText('Move to left'))
        /* The menu's button went with the old strip */
        await waitFor(() =>
            expect(
                toolsStrip().getByRole('tab', { name: 'Add views' })
            ).toHaveFocus()
        )

        /* Once on the left, the menu offers the top edge instead */
        await userEvent.click(screen.getByTestId('move-tools-button'))
        expect(await screen.findByText('Move to top')).toBeInTheDocument()
        expect(screen.queryByText('Move to left')).toBeNull()
        expect(
            screen.getByTestId('collapse-tools-button')
        ).toHaveAccessibleName('Expand')

        await userEvent.click(screen.getByText('Move to top'))
        await userEvent.click(screen.getByTestId('move-tools-button'))
        expect(await screen.findByText('Move to left')).toBeInTheDocument()
    })

    it('closes a header menu when clicking outside it', async () => {
        await renderWorkspace()
        await userEvent.click(screen.getByTestId('move-tools-button'))
        expect(await screen.findByText('Move to left')).toBeInTheDocument()

        /* The popover's layer has a backdrop that catches outside clicks */
        const backdrop = screen
            .getByTestId('dhis2-uicore-layer')
            .querySelector('.backdrop') as HTMLElement
        await userEvent.click(backdrop)

        await waitFor(() =>
            expect(screen.queryByText('Move to left')).toBeNull()
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

        const mapTab = viewsGrid().getByRole('tab', { name: 'Map 1' })
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
        /* Focus follows the swapped view to its new cell */
        expect(viewsGrid().getByRole('tab', { name: 'Map 1' })).toHaveFocus()
        const placeholdersAfter = screen.getAllByTestId('view-placeholder')
        expect(placeholdersAfter).toHaveLength(2)
        placeholdersBefore.forEach((placeholder) =>
            expect(placeholdersAfter).toContain(placeholder)
        )
        expect(selectViews(store.getState())).toEqual(viewsBefore)
        expect(
            toolsStrip().getByRole('tab', { name: 'Map 1' })
        ).toHaveAttribute('aria-selected', 'true')
        expect(
            toolsStrip().getByRole('tab', { name: 'Visualization 1' })
        ).toBeInTheDocument()
    })

    it('selects the view swapped from its menu, opened from the keyboard', async () => {
        const { store } = await renderWorkspace()
        await userEvent.click(screen.getByTestId('add-view-map'))
        await userEvent.click(screen.getByTestId('add-view-visualization'))
        await userEvent.click(
            toolsStrip().getByRole('tab', { name: 'Visualization 1' })
        )
        expect(selectActiveView(store.getState())?.type).toBe('visualization')

        /* No pointer on Map 1, which would select it on its own */
        const mapCell = viewsGrid()
            .getByRole('tab', { name: 'Map 1' })
            .closest('.dv-groupview') as HTMLElement
        within(mapCell).getByTestId('view-actions-button').focus()
        await userEvent.keyboard('{Enter}')
        await screen.findByText('Swap with Visualization 1')
        await userEvent.keyboard('{Enter}')

        /* Map 1's settings came forward, so Map 1 is selected */
        await waitFor(() =>
            expect(selectActiveView(store.getState())?.type).toBe('map')
        )
        expect(
            toolsStrip().getByRole('tab', { name: 'Map 1' })
        ).toHaveAttribute('aria-selected', 'true')
    })

    it('selects no view after swapping text views, which have no settings', async () => {
        const { store } = await renderWorkspace()
        await userEvent.click(screen.getByTestId('add-view-text'))
        await userEvent.click(screen.getByTestId('add-view-text'))
        const cellOf = (title: string) =>
            viewsGrid()
                .getByRole('tab', { name: title })
                .closest('.dv-groupview') as HTMLElement
        const secondCell = cellOf('Text 2')
        within(cellOf('Text 1')).getByTestId('view-actions-button').focus()
        await userEvent.keyboard('{Enter}')
        await screen.findByText('Swap with Text 2')
        await userEvent.keyboard('{Enter}')

        await waitFor(() => expect(cellOf('Text 1')).toBe(secondCell))
        expect(selectActiveView(store.getState())).toBeNull()
    })

    it('moves a view to a new row or column at the grid\u2019s edge from its menu', async () => {
        await renderWorkspace()
        await userEvent.click(screen.getByTestId('add-view-map'))
        await userEvent.click(screen.getByTestId('add-view-visualization'))
        const mapCell = () =>
            viewsGrid()
                .getByRole('tab', { name: 'Map 1' })
                .closest('.dv-groupview') as HTMLElement

        await userEvent.click(
            within(mapCell()).getByTestId('view-actions-button')
        )

        /* The 1000x800 window stacks the views: Map 1 already runs along
         * the top edge */
        expect(
            (await screen.findAllByRole('menuitem')).map(
                (item) => item.textContent
            )
        ).toEqual([
            'Swap with Visualization 1',
            'Move to a new row at the bottom',
            'Move to a new column on the left',
            'Move to a new column on the right',
        ])
        await userEvent.click(
            screen.getByText('Move to a new row at the bottom')
        )

        const viewOrder = () =>
            [...document.querySelectorAll('.dv-grid-view .dv-groupview')].map(
                (group) => group.querySelector('.dv-tab')?.textContent
            )
        await waitFor(() =>
            expect(viewOrder()).toEqual(['Visualization 1', 'Map 1'])
        )
        expect(viewsGrid().getByRole('tab', { name: 'Map 1' })).toHaveFocus()
    })

    it('opens a view\u2019s settings on a double click on its header, expanding the strip', async () => {
        await renderWorkspace()
        await userEvent.click(screen.getByTestId('add-view-map'))
        await userEvent.click(screen.getByTestId('collapse-tools-button'))
        await waitFor(() =>
            expect(
                screen.getByTestId('collapse-tools-button')
            ).toHaveAccessibleName('Expand')
        )

        await userEvent.dblClick(
            within(viewsGrid().getByRole('tab', { name: 'Map 1' })).getByText(
                'Map 1'
            )
        )

        await waitFor(() =>
            expect(
                screen.getByTestId('collapse-tools-button')
            ).toHaveAccessibleName('Collapse')
        )
        expect(
            toolsStrip().getByRole('tab', { name: 'Map 1' })
        ).toHaveAttribute('aria-selected', 'true')
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

    it('announces a maximized view that is closed as closed, not restored', async () => {
        await renderWorkspace()
        await userEvent.click(screen.getByTestId('add-view-map'))
        await userEvent.click(screen.getByTestId('add-view-visualization'))
        const [maximize] = await screen.findAllByTestId('maximize-view-button')
        await userEvent.click(maximize)
        await screen.findByRole('button', { name: 'Restore' })

        const mapTab = viewsGrid().getByRole('tab', { name: 'Map 1' })
        await userEvent.click(
            within(mapTab).getByRole('button', { name: /close/i })
        )

        await waitFor(() =>
            expect(
                document.querySelector('[aria-live="polite"]')?.textContent
            ).toBe('Map 1 closed')
        )
    })
})
