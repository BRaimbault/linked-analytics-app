import { renderWithStore } from '@components/workspace/__tests__/render-with-store'
import { SelectorPanel } from '@components/workspace/panels/selector-panel'
import { dataClicked } from '@store/interactions-slice'
import { viewAdded } from '@store/workspace-slice'
import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

const YEARS = [
    { id: '2026', name: '2026' },
    { id: '2025', name: '2025' },
]

const renderPeriodSelector = () => {
    const view = renderWithStore(<SelectorPanel viewId="pe-1" items={YEARS} />)
    act(() => {
        view.store.dispatch(
            viewAdded({ id: 'pe-1', type: 'period-selector', number: 1 })
        )
        view.store.dispatch(
            viewAdded({ id: 'vis-1', type: 'visualization', number: 1 })
        )
    })
    return view
}

const selectInput = () =>
    within(screen.getByTestId('selector-view')).getByTestId(
        'dhis2-uicore-select-input'
    )

describe('SelectorPanel', () => {
    it('draws nothing until its channel exists', () => {
        renderWithStore(<SelectorPanel viewId="pe-1" items={YEARS} />)

        expect(screen.queryByTestId('selector-view')).toBeNull()
    })

    it('names its channel, and sets and clears its value', async () => {
        const { store } = renderPeriodSelector()
        expect(screen.getByTestId('selector-view')).toHaveTextContent(
            'Period A'
        )

        await userEvent.click(selectInput())
        await userEvent.click(await screen.findByText('2025'))
        expect(store.getState().interactions.channels[0].value).toEqual([
            YEARS[1],
        ])

        await userEvent.click(
            within(screen.getByTestId('selector-view')).getByTestId(/-clear$/)
        )
        expect(store.getState().interactions.channels[0].value).toEqual([])
    })

    it('shows a clicked value, by its id when it has no name', () => {
        const { store } = renderPeriodSelector()

        act(() => {
            store.dispatch(
                dataClicked({
                    viewId: 'vis-1',
                    click: { pe: { id: '202601' } },
                    additive: false,
                })
            )
        })

        expect(selectInput()).toHaveTextContent('202601')
    })
})
