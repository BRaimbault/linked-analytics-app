import { IconButton } from '@components/workspace/tabs/icon-button'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

describe('IconButton', () => {
    it('is a single Tab stop that shows its label on focus', async () => {
        const onClick = vi.fn()
        render(
            <>
                <IconButton
                    label="Maximize"
                    icon={<svg />}
                    dataTest="maximize"
                    onClick={onClick}
                />
                <button type="button">Next</button>
            </>
        )

        await userEvent.tab()
        expect(screen.getByTestId('maximize')).toHaveFocus()
        expect(await screen.findByRole('tooltip')).toHaveTextContent('Maximize')
        await userEvent.tab()
        expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus()

        await userEvent.click(screen.getByTestId('maximize'))
        expect(onClick).toHaveBeenCalled()
        /* A click hovers and focuses, and @dhis2/ui 10.20's Tooltip starts
         * an open timer for each without clearing the first, which then
         * outlives its unmount. Let it fire while the page exists; remove
         * once Tooltip clears a running timer before starting another. */
        await new Promise((resolve) => setTimeout(resolve, 250))
    })
})
