import { DemoWorkspace } from '@components/demo/demo-workspace'
import { renderWithStore } from '@components/workspace/__tests__/render-with-store'
import {
    mockContainerSize,
    renderWorkspace,
    toolsStrip,
    viewsGrid,
} from '@components/workspace/__tests__/render-workspace'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

mockContainerSize()

/* The tour has its own spec; here it has been seen, so it stays closed.
 * The setup clears the storage before each test. */
beforeEach(() => {
    localStorage.setItem('linked-analytics.demo-tour-seen', 'true')
})

/* jsdom lays nothing out, so a view's body has no size to give its plugin */
vi.mock('@components/plugins/use-element-size', () => ({
    useElementSize: () => ({ width: 600, height: 400 }),
}))

const viewTitles = () =>
    viewsGrid()
        .getAllByRole('tab')
        .map(({ textContent }) => textContent?.trim())
        .sort()

/* The tree's value, as text: the tree itself names every unit */
const orgUnitValue = () =>
    within(screen.getByTestId('org-unit-tree')).getByTestId('selector-value')

const PRESET_TITLES = [
    'Data 1',
    'Map 1',
    'Org unit 1',
    'Period 1',
    'Visualization 1',
    'Visualization 2',
]

describe('DemoWorkspace', () => {
    it('shows the banner, and starts with the preset’s views and items', async () => {
        renderWithStore(<DemoWorkspace />)

        expect(screen.getByTestId('demo-banner')).toHaveTextContent(
            'Nothing here comes from the server'
        )
        await waitFor(() => expect(viewTitles()).toEqual(PRESET_TITLES))
        expect(screen.getAllByTestId('fake-visualization')).toHaveLength(2)
        expect(screen.getByTestId('fake-map')).toBeInTheDocument()
        expect(screen.getAllByTestId('selector-view')).toHaveLength(3)
    })

    it('brings the preset back from the Workspace tab', async () => {
        renderWithStore(<DemoWorkspace />)
        await waitFor(() => expect(viewTitles()).toEqual(PRESET_TITLES))
        const feature = screen
            .getAllByTestId('fake-feature')
            .find(({ textContent }) => textContent?.startsWith('East:'))
        fireEvent.click(feature as Element)
        await waitFor(() => expect(orgUnitValue()).toHaveTextContent('East'))
        await userEvent.click(
            toolsStrip().getByRole('tab', { name: 'Workspace' })
        )
        await userEvent.click(screen.getByTestId('reset-to-preset'))

        await waitFor(() =>
            expect(orgUnitValue()).toHaveTextContent('Each view shows its own')
        )
        expect(viewTitles()).toEqual(PRESET_TITLES)
    })

    it('has every view show the data item picked in the data selector, each showing one', async () => {
        renderWithStore(<DemoWorkspace />)
        await waitFor(() => expect(viewTitles()).toEqual(PRESET_TITLES))
        const [, , dataSelector] = screen.getAllByTestId('selector-view')

        await userEvent.click(
            within(dataSelector).getByTestId('dhis2-uicore-select-input')
        )
        await userEvent.click(
            await screen.findByText('ANC 1st visit', {
                selector: '[data-test="dhis2-uicore-singleselectoption"] *',
            })
        )

        await waitFor(() =>
            expect(
                [
                    screen.getByTestId('fake-map'),
                    ...screen.getAllByTestId('fake-visualization'),
                ].map((view) => view.textContent?.includes('ANC 1st visit'))
            ).toEqual([true, true, true])
        )
    })

    it('has the chart and the table follow the period with Highlight only, keeping their own', async () => {
        const { store } = renderWithStore(<DemoWorkspace />)
        await waitFor(() => expect(viewTitles()).toEqual(PRESET_TITLES))
        const { channels } = store.getState().interactions
        const periodMembers = channels.find(
            ({ dimension }) => dimension === 'pe'
        )?.members
        const highlighting = Object.entries(periodMembers ?? {}).filter(
            ([, { highlightOnly }]) => highlightOnly
        )

        const titles = highlighting.map(([viewId]) => {
            const view = store
                .getState()
                .workspace.views.find(({ id }) => id === viewId)
            return `${view?.type} ${view?.number}`
        })
        expect(titles).toEqual(['visualization 1', 'visualization 2'])
    })

    it('offers no reset without a preset', async () => {
        renderWorkspace()
        await userEvent.click(
            toolsStrip().getByRole('tab', { name: 'Workspace' })
        )

        expect(screen.queryByTestId('reset-to-preset')).toBeNull()
    })
})
