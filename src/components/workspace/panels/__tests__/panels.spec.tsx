import {
    NO_PLUGIN_SOURCES,
    PluginSourcesProvider,
} from '@components/plugins/plugin-sources'
import { renderWithStore } from '@components/workspace/__tests__/render-with-store'
import { SettingsPanel } from '@components/workspace/panels/settings-panel'
import { ToolPanel } from '@components/workspace/panels/tool-panel'
import { ViewPlaceholderPanel } from '@components/workspace/panels/view-placeholder-panel'
import { WorkspaceApiContext } from '@components/workspace/workspace-api-context'
import { DEMO_MAPS } from '@modules/demo/saved-items'
import { viewAdded } from '@store/workspace-slice'
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DockviewApi } from 'dockview-react'
import { describe, expect, it, vi } from 'vitest'
import { createFakeGroup, createFakePanel, panelProps } from './panel-props'

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

    it('tells what a selector\u2019s settings will hold, and shows its links', () => {
        const { store } = renderWithStore(
            <SettingsPanel {...panelProps({ viewId: 'ou-a' })} />
        )

        act(() => {
            store.dispatch(
                viewAdded({ id: 'ou-a', type: 'org-unit-selector', number: 1 })
            )
        })

        expect(screen.getByText('Org unit 1')).toBeInTheDocument()
        expect(
            screen.getByText(/org units this selector offers/)
        ).toBeInTheDocument()
        expect(screen.getByTestId('links-selector')).toHaveTextContent(
            'ChannelA · Nothing selected'
        )
    })

    it('gives a data selector its channel in the Links section', () => {
        const { store } = renderWithStore(
            <SettingsPanel {...panelProps({ viewId: 'dx-a' })} />
        )

        act(() => {
            store.dispatch(
                viewAdded({ id: 'dx-a', type: 'data-selector', number: 1 })
            )
        })

        expect(screen.getByTestId('links-selector')).toHaveTextContent('Data')
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

    it('asks for a saved item where saved items are offered, as in the demo', () => {
        const props = panelProps({ type: 'map' as const, number: 1 })
        const { unmount } = renderWithStore(<ViewPlaceholderPanel {...props} />)
        expect(
            screen.getByText('The plugin will render here')
        ).toBeInTheDocument()
        unmount()

        renderWithStore(
            <PluginSourcesProvider
                sources={{
                    ...NO_PLUGIN_SOURCES,
                    savedItems: { map: DEMO_MAPS },
                }}
            >
                <ViewPlaceholderPanel {...props} />
            </PluginSourcesProvider>
        )
        expect(
            screen.getByText('Pick a saved item in its settings')
        ).toBeInTheDocument()
    })

    it('selects its view even before the workspace is ready', async () => {
        const props = panelProps({ type: 'map' as const, number: 1 })
        renderWithStore(<ViewPlaceholderPanel {...props} />)

        await userEvent.click(screen.getByTestId('edit-view-settings'))

        expect(props.api.setActive).toHaveBeenCalled()
    })
})

describe('ToolPanel', () => {
    it('takes no focus while its strip is collapsed, even once moved', () => {
        const panel = createFakePanel({ viewId: 'vis-a' })
        const { store } = renderWithStore(<SettingsPanel {...panel.props} />)
        act(() => {
            store.dispatch(
                viewAdded({ id: 'vis-a', type: 'visualization', number: 1 })
            )
        })
        const body = screen.getByTestId('settings-panel-vis-a')

        expect(body).not.toHaveAttribute('inert')
        act(() => panel.group().setCollapsed(true))
        expect(body).toHaveAttribute('inert')
        act(() => panel.moveToGroup(createFakeGroup()))
        expect(body).not.toHaveAttribute('inert')
        act(() => panel.group().setCollapsed(true))
        expect(body).toHaveAttribute('inert')
    })

    it('fits the strip as its content resizes and as its tab comes to the front, not while folded', () => {
        const resizes: ResizeObserverCallback[] = []
        const disconnect = vi.fn()
        vi.stubGlobal(
            'ResizeObserver',
            class {
                constructor(callback: ResizeObserverCallback) {
                    resizes.push(callback)
                }
                observe() {}
                disconnect = disconnect
            }
        )
        /* Frames run when the test says, the last one asked for only */
        let nextFrame: FrameRequestCallback | null = null
        vi.stubGlobal(
            'requestAnimationFrame',
            (callback: FrameRequestCallback) => {
                nextFrame = callback
                return 1
            }
        )
        vi.stubGlobal('cancelAnimationFrame', () => {
            nextFrame = null
        })
        const runFrame = () => {
            const frame = nextFrame as FrameRequestCallback | null
            nextFrame = null
            frame?.(0)
        }
        /* Asked for the panel to fit, which it doesn't find: no strip */
        const getPanel = vi.fn()
        const workspaceApi = { getPanel } as unknown as DockviewApi
        const panel = createFakePanel({}, 'workspace')
        const { unmount } = renderWithStore(
            <WorkspaceApiContext.Provider value={workspaceApi}>
                <ToolPanel api={panel.props.api}>Settings</ToolPanel>
            </WorkspaceApiContext.Provider>
        )

        resizes.at(-1)?.([], {} as ResizeObserver)
        act(() => panel.changeVisibility())
        expect(getPanel).not.toHaveBeenCalled()
        runFrame()
        expect(getPanel).toHaveBeenCalledTimes(1)
        expect(getPanel).toHaveBeenCalledWith('workspace')

        act(() => panel.group().setCollapsed(true))
        expect(disconnect).toHaveBeenCalled()
        act(() => panel.changeVisibility())
        runFrame()
        expect(getPanel).toHaveBeenCalledTimes(1)
        unmount()
    })
})
