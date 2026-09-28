import { renderWithStore } from '@components/workspace/__tests__/render-with-store'
import type { ViewPanelParams } from '@components/workspace/controller/panels'
import { ViewPanel } from '@components/workspace/panels/view-panel'
import { CustomDataProvider } from '@dhis2/app-runtime'
import { viewHeadersChanged } from '@store/workspace-settings-slice'
import { activeViewChanged, viewAdded } from '@store/workspace-slice'
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { panelProps } from './panel-props'

const setUpText = (text?: string) => {
    const params: ViewPanelParams = { type: 'text', number: 1, text }
    const props = panelProps(params, 'text-a')
    /* The editor's user mentions query the server */
    renderWithStore(
        <CustomDataProvider data={{}}>
            <ViewPanel {...props} />
        </CustomDataProvider>
    )
    return props.api
}

describe('TextViewPanel', () => {
    it('shows its text with DHIS2 formatting', () => {
        setUpText('A *bold* title')

        expect(screen.getByText('bold').tagName).toBe('STRONG')
    })

    it('invites a first text when empty', () => {
        setUpText()

        expect(screen.getByText('No text yet')).toBeInTheDocument()
    })

    it('saves what was written when done', async () => {
        const api = setUpText()

        await userEvent.click(screen.getByRole('button', { name: 'Edit text' }))
        await userEvent.type(screen.getByRole('textbox'), 'Malaria cases')
        await userEvent.click(screen.getByRole('button', { name: 'Done' }))

        expect(api.updateParameters).toHaveBeenCalledWith({
            type: 'text',
            number: 1,
            text: 'Malaria cases',
        })
        expect(screen.queryByRole('textbox')).toBeNull()
    })

    it('edits on a double click, and saves with Ctrl+Enter', async () => {
        const api = setUpText('Old')

        await userEvent.dblClick(screen.getByTestId('text-view'))
        await userEvent.type(screen.getByRole('textbox'), ' and new')
        await userEvent.keyboard('{Control>}{Enter}{/Control}')

        expect(api.updateParameters).toHaveBeenCalledWith(
            expect.objectContaining({ text: 'Old and new' })
        )
        expect(screen.queryByRole('textbox')).toBeNull()
    })

    it('saves with Cmd+Enter on a Mac', async () => {
        const api = setUpText('Old')

        await userEvent.click(screen.getByRole('button', { name: 'Edit text' }))
        await userEvent.type(screen.getByRole('textbox'), '!')
        await userEvent.keyboard('{Meta>}{Enter}{/Meta}')

        expect(api.updateParameters).toHaveBeenCalledWith(
            expect.objectContaining({ text: 'Old!' })
        )
    })

    it('discards the changes with Escape or Cancel', async () => {
        const api = setUpText('Old')

        await userEvent.click(screen.getByRole('button', { name: 'Edit text' }))
        await userEvent.type(screen.getByRole('textbox'), ' lost')
        await userEvent.keyboard('{Escape}')
        await userEvent.click(screen.getByRole('button', { name: 'Edit text' }))
        await userEvent.type(screen.getByRole('textbox'), ' lost too')
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

        expect(api.updateParameters).not.toHaveBeenCalled()
        expect(screen.getByText('Old')).toBeInTheDocument()
        expect(api.isMaximized()).toBe(false)
    })

    it('keeps writing on a plain Enter', async () => {
        const api = setUpText()

        await userEvent.click(screen.getByRole('button', { name: 'Edit text' }))
        await userEvent.type(screen.getByRole('textbox'), 'Line{Enter}')

        expect(api.updateParameters).not.toHaveBeenCalled()
        expect(screen.getByRole('textbox')).toHaveValue('Line\n')
    })

    it('keeps the text as it was when nothing changed', async () => {
        const api = setUpText('Same')

        await userEvent.click(screen.getByRole('button', { name: 'Edit text' }))
        await userEvent.keyboard('{Shift}')
        await userEvent.click(screen.getByRole('button', { name: 'Done' }))

        expect(api.updateParameters).not.toHaveBeenCalled()
        expect(screen.getByText('Same')).toBeInTheDocument()
    })

    it('is maximized while being written when too small, and put back after', async () => {
        const api = setUpText('Note')

        await userEvent.click(screen.getByRole('button', { name: 'Edit text' }))
        expect(api.isMaximized()).toBe(true)
        await userEvent.click(screen.getByRole('button', { name: 'Done' }))

        expect(api.isMaximized()).toBe(false)
    })

    it('is written in place when tall enough for the editor, however narrow', async () => {
        const api = setUpText('Note')
        Object.assign(api, { height: 300 })

        await userEvent.click(screen.getByRole('button', { name: 'Edit text' }))

        expect(screen.getByRole('textbox')).toBeInTheDocument()
        expect(api.maximize).not.toHaveBeenCalled()
    })

    it('stays maximized when it was before being written', async () => {
        const api = setUpText('Note')
        api.maximize()

        await userEvent.click(screen.getByRole('button', { name: 'Edit text' }))
        await userEvent.click(screen.getByRole('button', { name: 'Done' }))

        expect(api.isMaximized()).toBe(true)
        expect(api.exitMaximized).not.toHaveBeenCalled()
    })

    it('frames the selected view while headers only show on hover', () => {
        const props = panelProps<ViewPanelParams>(
            { type: 'map', number: 1 },
            'map-a'
        )
        const { store } = renderWithStore(<ViewPanel {...props} />)
        act(() => {
            store.dispatch(viewAdded({ id: 'map-a', type: 'map', number: 1 }))
            store.dispatch(activeViewChanged('map-a'))
        })
        expect(screen.queryByTestId('selected-frame')).toBeNull()

        act(() => {
            store.dispatch(viewHeadersChanged('hover'))
        })
        expect(screen.getByTestId('selected-frame')).toBeInTheDocument()

        act(() => {
            store.dispatch(activeViewChanged(null))
        })
        expect(screen.queryByTestId('selected-frame')).toBeNull()
    })

    it('shows the placeholder of other views', () => {
        renderWithStore(
            <ViewPanel
                {...panelProps<ViewPanelParams>({ type: 'map', number: 1 })}
            />
        )

        expect(screen.getByTestId('view-placeholder')).toBeInTheDocument()
    })
})
