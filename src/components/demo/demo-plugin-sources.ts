import type { PluginSources } from '@components/plugins/plugin-sources'
import { getDataItem } from '@modules/demo/data-items'
import { getOrgUnit, ORG_UNIT_LEVELS } from '@modules/demo/org-units'
import { DEMO_MAPS, DEMO_VISUALIZATIONS } from '@modules/demo/saved-items'
import {
    DEMO_SELECTOR_ITEMS,
    DEMO_TIMELINE_PERIODS,
    DEMO_TREE_ROOTS,
} from '@modules/demo/selector-items'
import type { PluginProps } from '@modules/plugins/contract'
import type { ComponentType } from 'react'
import { FakeMap } from './fake-map'
import { FakeVisualization } from './fake-visualization'

/* Demo mode's plugins, saved items and selector lists: the fakes, on the
 * demo's data */
export const DEMO_PLUGIN_SOURCES: PluginSources = {
    renderers: {
        visualization: FakeVisualization as ComponentType<PluginProps>,
        map: FakeMap as ComponentType<PluginProps>,
    },
    savedItems: {
        visualization: DEMO_VISUALIZATIONS,
        map: DEMO_MAPS,
    },
    selectorItems: DEMO_SELECTOR_ITEMS,
    timelinePeriods: DEMO_TIMELINE_PERIODS,
    orgUnitTreeRoots: DEMO_TREE_ROOTS,
    orgUnitLevelCount: ORG_UNIT_LEVELS.length,
    getOrgUnitName: (id) => getOrgUnit(id)?.name,
    getLegendSetId: (id) => getDataItem(id)?.legendSetId,
    getRasterSource: (id) => {
        const item = getDataItem(id)
        return item?.dimensionItemType === 'DATA_ELEMENT'
            ? item.importedFrom
            : undefined
    },
    canHighlight: { visualization: true, map: true },
}
