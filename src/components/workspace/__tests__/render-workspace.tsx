import { DEMO_PLUGIN_SOURCES } from '@components/demo/demo-plugin-sources'
import {
    NO_PLUGIN_SOURCES,
    PluginSourcesProvider,
    type PluginSources,
} from '@components/plugins/plugin-sources'
import { Workspace } from '@components/workspace/workspace'
import { within, screen } from '@testing-library/react'
import { afterAll, beforeAll, vi } from 'vitest'
import { renderWithStore } from './render-with-store'

/* jsdom has no layout, so dockview would measure a 0x0 container: call in
 * a spec file that renders the real workspace */
export const mockContainerSize = () => {
    beforeAll(() => {
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(
            1000
        )
        vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(
            800
        )
    })

    afterAll(() => {
        vi.restoreAllMocks()
    })
}

/* In demo mode, plugin views draw the fake plugins; a test may give its
 * own sources */
export const renderWorkspace = async ({
    demo = false,
    sources = demo ? DEMO_PLUGIN_SOURCES : NO_PLUGIN_SOURCES,
}: { demo?: boolean; sources?: PluginSources } = {}) => {
    const view = renderWithStore(
        <PluginSourcesProvider sources={sources}>
            <Workspace />
        </PluginSourcesProvider>
    )
    await screen.findByRole('tab', { name: 'Add views' })
    return view
}

/* Settings tabs share their view's name, so they are looked up in the
 * tools strip */
export const toolsStrip = () =>
    within(document.querySelector('.dv-edge-group') as HTMLElement)

/* The grid of views, without the tools strip */
export const viewsGrid = () =>
    within(document.querySelector('.dv-grid-view') as HTMLElement)
