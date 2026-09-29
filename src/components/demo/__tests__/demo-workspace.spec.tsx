import { DemoWorkspace } from '@components/demo/demo-workspace'
import { renderWithStore } from '@components/workspace/__tests__/render-with-store'
import {
    mockContainerSize,
    renderWorkspace,
    toolsStrip,
    viewsGrid,
} from '@components/workspace/__tests__/render-workspace'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

mockContainerSize()

/* jsdom lays nothing out, so a view's body has no size to give its plugin */
vi.mock('@components/plugins/use-element-size', () => ({
    useElementSize: () => ({ width: 600, height: 400 }),
}))

const viewTitles = () =>
    viewsGrid()
        .getAllByRole('tab')
        .map(({ textContent }) => textContent?.trim())
        .sort()

const PRESET_TITLES = [
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
        expect(screen.getAllByTestId('selector-view')).toHaveLength(2)
    })

    it('brings the preset back from the Workspace tab', async () => {
        renderWithStore(<DemoWorkspace />)
        await waitFor(() => expect(viewTitles()).toEqual(PRESET_TITLES))
        const feature = screen
            .getAllByTestId('fake-feature')
            .find(({ textContent }) => textContent?.startsWith('East:'))
        fireEvent.click(feature as Element)
        await waitFor(() =>
            expect(screen.getAllByTestId('selector-view')[1]).toHaveTextContent(
                'East'
            )
        )
        await userEvent.click(
            toolsStrip().getByRole('tab', { name: 'Workspace' })
        )
        await userEvent.click(screen.getByTestId('reset-to-preset'))

        await waitFor(() =>
            expect(screen.getAllByTestId('selector-view')[1]).toHaveTextContent(
                'Each view shows its own'
            )
        )
        expect(viewTitles()).toEqual(PRESET_TITLES)
    })

    it('offers no reset without a preset', async () => {
        renderWorkspace()
        await userEvent.click(
            toolsStrip().getByRole('tab', { name: 'Workspace' })
        )

        expect(screen.queryByTestId('reset-to-preset')).toBeNull()
    })
})
