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
    })
})
