import { DEMO_PLUGIN_SOURCES } from '@components/demo/demo-plugin-sources'
import { NO_PLUGIN_SOURCES } from '@components/plugins/plugin-sources'
import { DATA_ITEM_IDS } from '@modules/demo/data-items'
import { describe, expect, it } from 'vitest'

describe('DEMO_PLUGIN_SOURCES', () => {
    it('looks a data item’s legend set up in the demo’s data', () => {
        const { getLegendSetId } = DEMO_PLUGIN_SOURCES

        expect(getLegendSetId(DATA_ITEM_IDS.penta3)).toBe('DemoLegCov1')
        expect(getLegendSetId(DATA_ITEM_IDS.malaria)).toBeUndefined()
        /* Without plugins, the app knows no data item */
        expect(
            NO_PLUGIN_SOURCES.getLegendSetId(DATA_ITEM_IDS.penta3)
        ).toBeUndefined()
    })
})
