import { PluginSourcesProvider } from '@components/plugins/plugin-sources'
import { Workspace } from '@components/workspace/workspace'
import type { FC } from 'react'
import { DemoBanner } from './demo-banner'
import { DemoDataProvider } from './demo-data-provider'
import { DEMO_PLUGIN_SOURCES } from './demo-plugin-sources'
import { DEMO_PRESET } from './demo-preset'
import { DemoTour } from './tour/demo-tour'
import { useTourRequest } from './tour/use-tour-request'

/* The workspace in demo mode: every view is fake, and it starts with the
 * demo's preset and its guided tour. The app loads this file only when
 * ?demo is set. */
export const DemoWorkspace: FC = () => {
    const { request, takeTour, onTourStarted } = useTourRequest()
    return (
        <DemoDataProvider>
            <PluginSourcesProvider sources={DEMO_PLUGIN_SOURCES}>
                <DemoBanner onTakeTour={takeTour} />
                <Workspace preset={DEMO_PRESET}>
                    <DemoTour request={request} onStart={onTourStarted} />
                </Workspace>
            </PluginSourcesProvider>
        </DemoDataProvider>
    )
}
