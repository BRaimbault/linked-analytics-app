import { ActionsMenu } from '@components/workspace/tabs/actions-menu'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const mountMenu = (onClick = vi.fn()) => {
    render(
        <ActionsMenu
            label="Actions"
            dataTest="actions"
            actions={[
                { key: 'a', label: 'First', dataTest: 'first', onClick },
                { key: 'b', label: 'Second', dataTest: 'second', onClick },
            ]}
        />
    )
    return onClick
}

const openWithKeyboard = async () => {
    await userEvent.tab()
    await userEvent.keyboard('{Enter}')
}

describe('ActionsMenu', () => {
    it('moves focus into the menu when it opens, and through it with the arrow keys', async () => {
        mountMenu()

        await openWithKeyboard()
        /* DHIS2's menu focuses the item holding the menuitem link */
        expect(await screen.findByTestId('first')).toHaveFocus()

        await userEvent.keyboard('{ArrowDown}')
        expect(screen.getByTestId('second')).toHaveFocus()
    })

    it('runs the focused item with Enter, then gives focus back to the button', async () => {
        const onClick = mountMenu(vi.fn())

        await openWithKeyboard()
        await screen.findByRole('menuitem', { name: 'First' })
        await userEvent.keyboard('{Enter}')

        expect(onClick).toHaveBeenCalledTimes(1)
        expect(screen.queryByRole('menu')).not.toBeInTheDocument()
        expect(screen.getByTestId('actions')).toHaveFocus()
    })

    it.each(['{Escape}', '{Tab}'])(
        'closes on %s, giving focus back to the button',
        async (key) => {
            const onClick = mountMenu(vi.fn())

            await openWithKeyboard()
            await screen.findByRole('menuitem', { name: 'First' })
            await userEvent.keyboard(key)

            expect(screen.queryByRole('menu')).not.toBeInTheDocument()
            expect(screen.getByTestId('actions')).toHaveFocus()
            expect(onClick).not.toHaveBeenCalled()
        }
    )

    it('leaves focus where an action moved it', async () => {
        const elsewhere = document.createElement('button')
        mountMenu(vi.fn(() => elsewhere.focus()))
        /* Added after the menu, so the first Tab still reaches the button */
        document.body.append(elsewhere)

        await openWithKeyboard()
        await screen.findByRole('menuitem', { name: 'First' })
        await userEvent.keyboard('{Enter}')

        expect(elsewhere).toHaveFocus()
        elsewhere.remove()
    })

    it('closes when clicking outside, without moving focus', async () => {
        mountMenu()

        await userEvent.click(screen.getByTestId('actions'))
        await screen.findByRole('menu')
        const layer = screen.getByTestId('dhis2-uicore-layer')
        await userEvent.click(layer.firstElementChild as HTMLElement)

        expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })
})
