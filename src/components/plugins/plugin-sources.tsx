import type { LinkItem } from '@modules/interactions/apply-links'
import type { LinkDimension } from '@modules/interactions/channels'
import type { PluginObject, PluginProps } from '@modules/plugins/contract'
import type { PluginViewType } from '@modules/workspace/view-types'
import {
    createContext,
    useContext,
    type ComponentType,
    type FC,
    type ReactNode,
} from 'react'

/* Where a plugin view's plugin comes from, which saved items its settings
 * can open, and what selectors offer: the fakes and the demo's data in
 * demo mode, the real DV and Maps plugins later. Without a source, a view
 * keeps its placeholder. */
export type PluginSources = {
    renderers: Partial<Record<PluginViewType, ComponentType<PluginProps>>>
    savedItems: Partial<Record<PluginViewType, PluginObject[]>>
    selectorItems: Partial<Record<LinkDimension, LinkItem[]>>
    /* The deepest org unit level, where a linked unit has no children */
    orgUnitLevelCount: number
    /* An org unit's name from its id, for one a click only names in its
     * path (a parent to drill up to) */
    getOrgUnitName: (id: string) => string | undefined
    /* A data item's own legend set, which a map layer takes with it */
    getLegendSetId: (dataItemId: string) => string | undefined
}

export const NO_PLUGIN_SOURCES: PluginSources = {
    renderers: {},
    savedItems: {},
    selectorItems: {},
    orgUnitLevelCount: 0,
    getOrgUnitName: () => undefined,
    getLegendSetId: () => undefined,
}

const PluginSourcesContext = createContext<PluginSources>(NO_PLUGIN_SOURCES)

export const PluginSourcesProvider: FC<{
    sources: PluginSources
    children: ReactNode
}> = ({ sources, children }) => (
    <PluginSourcesContext.Provider value={sources}>
        {children}
    </PluginSourcesContext.Provider>
)

export const usePluginSources = (): PluginSources =>
    useContext(PluginSourcesContext)
