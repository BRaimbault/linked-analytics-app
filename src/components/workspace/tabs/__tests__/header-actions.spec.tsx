import {
    mockContainerSize,
    renderWorkspace,
} from '@components/workspace/__tests__/render-workspace'
import { selectViews } from '@store/workspace-slice'
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
