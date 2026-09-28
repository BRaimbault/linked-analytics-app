import { TabNameTooltip } from '@components/workspace/tabs/tab-name-tooltip'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

/* jsdom lays nothing out, so the name's sizes are given */
const setUpTabName = ({ cutShort }: { cutShort: boolean }) => {
    render(
        <TabNameTooltip name="Org unit 1" edge="top">
            <span className="dv-default-tab-content" data-test="name">
                Org unit 1
            </span>
        </TabNameTooltip>
    )
    const name = screen.getByTestId('name')
    Object.defineProperty(name, 'clientWidth', { value: 100 })
    Object.defineProperty(name, 'scrollWidth', {
        value: cutShort ? 150 : 100,
    })
    return name
}

describe('TabNameTooltip', () => {
    it('shows the full name of a tab that cuts it short', async () => {
        const tabName = setUpTabName({ cutShort: true })

        await userEvent.hover(tabName)

        expect(await screen.findByRole('tooltip')).toHaveTextContent(
            'Org unit 1'
        )
    })

    it('shows nothing when the whole name fits', async () => {
        const tabName = setUpTabName({ cutShort: false })

        await userEvent.hover(tabName)
        await new Promise((resolve) => setTimeout(resolve, 400))

        expect(screen.queryByRole('tooltip')).toBeNull()
    })
})
