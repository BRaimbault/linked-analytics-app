import { SettingsPanel } from '@components/workspace/panels/settings-panel'
import { ViewPlaceholderPanel } from '@components/workspace/panels/view-placeholder-panel'
import { viewAdded } from '@store/workspace-slice'
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DockviewApi, IDockviewPanelProps } from 'dockview-react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithStore } from './render-with-store'

const panelProps = <T extends object>(params: T, id = 'map-a') =>
    ({
        params,
        api: { id, setActive: vi.fn() },
        containerApi: {} as DockviewApi,
    }) as unknown as IDockviewPanelProps<T>

describe('SettingsPanel', () => {
    it('shows the settings placeholder of its view', () => {
        const { store } = renderWithStore(
            <SettingsPanel {...panelProps({ viewId: 'vis-a' })} />
        )

        act(() => {
            store.dispatch(
                viewAdded({ id: 'vis-a', type: 'visualization', number: 2 })
            )
        })

        expect(screen.getByText('Visualization 2')).toBeInTheDocument()
        expect(screen.getByText(/saved visualization/)).toBeInTheDocument()
    })

    it('tells what a selector\u2019s settings will hold, and that links go here', () => {
        const { store } = renderWithStore(
            <SettingsPanel {...panelProps({ viewId: 'ou-a' })} />
        )

        act(() => {
            store.dispatch(
                viewAdded({ id: 'ou-a', type: 'org-unit-selector', number: 1 })
            )
        })

        expect(screen.getByText('Org unit selector 1')).toBeInTheDocument()
        expect(
            screen.getByText(/org units this selector offers/)
        ).toBeInTheDocument()
        expect(
            screen.getByText('Links to other views will be set here.')
        ).toBeInTheDocument()
    })

    it.each([
        ['period-selector', /periods this selector offers/],
        ['data-selector', /data items this selector offers/],
    ] as const)('tells what a %s\u2019s settings will hold', (type, hint) => {
        const { store } = renderWithStore(
            <SettingsPanel {...panelProps({ viewId: 'selector-a' })} />
        )

        act(() => {
            store.dispatch(viewAdded({ id: 'selector-a', type, number: 1 }))
        })

        expect(screen.getByText(hint)).toBeInTheDocument()
    })

    it('renders nothing once its view is gone', () => {
        renderWithStore(<SettingsPanel {...panelProps({ viewId: 'gone' })} />)

        expect(screen.queryByTestId('settings-panel-gone')).toBeNull()
    })
})

describe('ViewPlaceholderPanel', () => {
    it('tells a plugin from a selector', () => {
        renderWithStore(
            <ViewPlaceholderPanel
                {...panelProps({
                    type: 'org-unit-selector' as const,
                    number: 1,
                })}
            />
        )

        expect(
            screen.getByText('The picker will render here')
        ).toBeInTheDocument()
    })

    it('selects its view even before the workspace is ready', async () => {
        const props = panelProps({ type: 'map' as const, number: 1 })
        renderWithStore(<ViewPlaceholderPanel {...props} />)

        await userEvent.click(screen.getByTestId('edit-view-settings'))

        expect(props.api.setActive).toHaveBeenCalled()
    })
})
