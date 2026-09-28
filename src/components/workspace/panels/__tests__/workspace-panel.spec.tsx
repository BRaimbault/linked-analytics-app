import { renderWithStore } from '@components/workspace/__tests__/render-with-store'
import { evenOutSizes } from '@components/workspace/controller/grid-layout'
import { WorkspacePanel } from '@components/workspace/panels/workspace-panel'
import { selectViewHeaders } from '@store/workspace-settings-slice'
import { viewAdded } from '@store/workspace-slice'
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DockviewApi } from 'dockview-react'
import { describe, expect, it, vi } from 'vitest'
import { panelProps } from './panel-props'

vi.mock('@components/workspace/controller/grid-layout', () => ({
    evenOutSizes: vi.fn(),
}))

const workspaceApi = {} as DockviewApi

describe('WorkspacePanel', () => {
    it('evens out the sizes once there are two views', async () => {
        const { store } = renderWithStore(
            <WorkspacePanel {...panelProps({})} />,
            { api: workspaceApi }
        )
        const evenOut = screen.getByRole('button', {
            name: 'Even out view sizes',
        })
        expect(evenOut).toBeDisabled()

        act(() => {
            store.dispatch(viewAdded({ id: 'map-a', type: 'map', number: 1 }))
            store.dispatch(
                viewAdded({ id: 'vis-a', type: 'visualization', number: 1 })
            )
        })
        await userEvent.click(evenOut)

        expect(evenOutSizes).toHaveBeenCalledWith(workspaceApi)
    })

    it('does nothing before the workspace is ready', async () => {
        const { store } = renderWithStore(
            <WorkspacePanel {...panelProps({})} />
        )
        act(() => {
            store.dispatch(viewAdded({ id: 'map-a', type: 'map', number: 1 }))
            store.dispatch(viewAdded({ id: 'map-b', type: 'map', number: 2 }))
        })

        await userEvent.click(
            screen.getByRole('button', { name: 'Even out view sizes' })
        )

        expect(evenOutSizes).not.toHaveBeenCalled()
    })

    it('evens out the sizes from its name too, once there are two views', async () => {
        const { store } = renderWithStore(
            <WorkspacePanel {...panelProps({})} />,
            { api: workspaceApi }
        )
        const name = screen.getByText('Even out view sizes')

        await userEvent.click(name)
        expect(evenOutSizes).not.toHaveBeenCalled()

        act(() => {
            store.dispatch(viewAdded({ id: 'map-a', type: 'map', number: 1 }))
            store.dispatch(viewAdded({ id: 'map-b', type: 'map', number: 2 }))
        })
        await userEvent.click(name)

        expect(evenOutSizes).toHaveBeenCalledWith(workspaceApi)
    })

    it('shows view headers only on hover, and always again', async () => {
        const { store } = renderWithStore(
            <WorkspacePanel {...panelProps({})} />
        )
        const onHover = screen.getByRole('checkbox', {
            name: 'Show view headers only on hover',
        })

        await userEvent.click(onHover)
        expect(selectViewHeaders(store.getState())).toBe('hover')

        await userEvent.click(onHover)
        expect(selectViewHeaders(store.getState())).toBe('always')
    })
})
