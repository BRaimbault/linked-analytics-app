import { DEMO_PLUGIN_SOURCES } from '@components/demo/demo-plugin-sources'
import {
    mockContainerSize,
    renderWorkspace,
    toolsStrip,
} from '@components/workspace/__tests__/render-workspace'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

mockContainerSize()

/* jsdom lays nothing out, so a view's body has no size to give its plugin */
vi.mock('@components/plugins/use-element-size', () => ({
    useElementSize: () => ({ width: 600, height: 400 }),
}))

const pickSavedItem = async (viewTitle: string, itemName: string) => {
    await userEvent.click(toolsStrip().getByRole('tab', { name: viewTitle }))
    const picker = await screen.findByTestId('saved-item-picker')
    await userEvent.click(
        within(picker).getByTestId('dhis2-uicore-select-input')
    )
    await userEvent.click(await screen.findByText(itemName))
}

/* View bodies live in overlays outside the grid's element, so they are
 * looked up in the whole page */
describe('picking a saved item', () => {
    it('draws the item in its view, and shows it as picked', async () => {
        await renderWorkspace({ demo: true })
        await userEvent.click(screen.getByTestId('add-view-visualization'))

        await pickSavedItem(
            'Visualization 1',
            'Malaria cases by district, last 12 months'
        )

        expect(
            await screen.findByTestId('fake-visualization')
        ).toBeInTheDocument()
        expect(screen.queryByTestId('view-placeholder')).toBeNull()
        await waitFor(() =>
            expect(
                within(screen.getByTestId('saved-item-picker')).getByTestId(
                    'dhis2-uicore-select-input'
                )
            ).toHaveTextContent('Malaria cases by district, last 12 months')
        )
    })

    it('draws a saved map in its view too', async () => {
        await renderWorkspace({ demo: true })
        await userEvent.click(screen.getByTestId('add-view-map'))

        await pickSavedItem('Map 1', 'Malaria cases by district')

        expect(await screen.findByTestId('fake-map')).toBeInTheDocument()
    })

    it('keeps the placeholder of a view whose type has no plugin', async () => {
        await renderWorkspace({
            sources: {
                ...DEMO_PLUGIN_SOURCES,
                renderers: {
                    visualization: DEMO_PLUGIN_SOURCES.renderers.visualization,
                },
            },
        })
        await userEvent.click(screen.getByTestId('add-view-map'))

        await pickSavedItem('Map 1', 'Malaria cases by district')

        expect(screen.getByTestId('view-placeholder')).toBeInTheDocument()
    })

    it('offers nothing to pick outside demo mode', async () => {
        await renderWorkspace()
        await userEvent.click(screen.getByTestId('add-view-visualization'))
        await userEvent.click(
            toolsStrip().getByRole('tab', { name: 'Visualization 1' })
        )

        expect(screen.queryByTestId('saved-item-picker')).toBeNull()
        expect(
            screen.getByText(/Choosing a saved visualization/)
        ).toBeInTheDocument()
    })
})
