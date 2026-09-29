import { PluginSourcesProvider } from '@components/plugins/plugin-sources'
import { Workspace } from '@components/workspace/workspace'
import type { FC } from 'react'
import { DemoBanner } from './demo-banner'
import { DEMO_PLUGIN_SOURCES } from './demo-plugin-sources'
import { DEMO_PRESET } from './demo-preset'

/* The workspace in demo mode: every view is fake, and it starts with the
 * demo's preset. The app loads this file only when ?demo is set. */
export const DemoWorkspace: FC = () => (
    <PluginSourcesProvider sources={DEMO_PLUGIN_SOURCES}>
        <DemoBanner />
        <Workspace preset={DEMO_PRESET} />
    </PluginSourcesProvider>
)
