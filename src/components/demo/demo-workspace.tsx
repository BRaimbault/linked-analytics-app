import { PluginSourcesProvider } from '@components/plugins/plugin-sources'
import { Workspace } from '@components/workspace/workspace'
import { useState, type FC } from 'react'
import { DemoBanner } from './demo-banner'
import { DemoDataProvider } from './demo-data-provider'
import { DEMO_PLUGIN_SOURCES } from './demo-plugin-sources'
import { DEMO_PRESET } from './demo-preset'
import { DemoTour } from './tour/demo-tour'
import { TOURS } from './tour/tours'
import { useTourRequest } from './tour/use-tour-request'

/* The workspace in demo mode: every view is fake, and it starts with the
 * preset of the tour it starts with (?demo=climate), or the demo's. A tour
 * may load another preset, which "Reset the demo" then brings back. The
 * app loads this file only when ?demo is set. */
export const DemoWorkspace: FC = () => {
    const { request, takeTour, onTourStarted } = useTourRequest()
    const [preset, setPreset] = useState(() =>
        request ? TOURS[request.kind].preset : DEMO_PRESET
    )
    return (
        <DemoDataProvider>
            <PluginSourcesProvider sources={DEMO_PLUGIN_SOURCES}>
                <DemoBanner onTakeTour={takeTour} />
                <Workspace preset={preset}>
                    <DemoTour
                        request={request}
                        onStart={onTourStarted}
                        onPresetLoad={setPreset}
                    />
                </Workspace>
            </PluginSourcesProvider>
        </DemoDataProvider>
    )
}
