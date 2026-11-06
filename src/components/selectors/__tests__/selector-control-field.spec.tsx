import {
    addView,
    mockContainerSize,
    renderWorkspace,
    toolsStrip,
} from '@components/workspace/__tests__/render-workspace'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

mockContainerSize()

const openSettings = (title: string) =>
    userEvent.click(toolsStrip().getByRole('tab', { name: title }))

describe('SelectorControlField', () => {
    it('turns a period selector into a timeline from its settings', async () => {
        await renderWorkspace({ demo: true })
        await addView('map')
        await addView('period-selector')
        await openSettings('Period 1')

        /* The field, before the parts it names after it */
        const [field] = screen.getAllByTestId(/^selector-control-/)
        expect(field).toHaveTextContent('Drop-down')
        await userEvent.click(
            within(field).getByTestId('dhis2-uicore-select-input')
        )
        await userEvent.click(await screen.findByText('Timeline'))

        expect(await screen.findByTestId('period-timeline')).toBeInTheDocument()
        expect(field).toHaveTextContent('Timeline')
    })

    it('offers no choice for a data selector, which has one control', async () => {
        await renderWorkspace({ demo: true })
        await addView('map')
        await addView('data-selector')
        await openSettings('Data 1')

        expect(screen.queryByTestId(/^selector-control-/)).toBeNull()
    })
})
