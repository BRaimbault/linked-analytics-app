import {
    getDataItem,
    getLegendSet,
    resolveDataItems,
} from '@modules/demo/data-items'
import { resolveOrgUnits } from '@modules/demo/org-units'
import { resolvePeriods } from '@modules/demo/periods'
import { DEMO_MAPS, DEMO_VISUALIZATIONS } from '@modules/demo/saved-items'
import {
    getDimensionItemIds,
    type MapView,
    type VisualizationObject,
} from '@modules/visualization/analytical-object'
import { describe, expect, it } from 'vitest'

const expectToResolve = (object: VisualizationObject | MapView) => {
    expect(resolveDataItems(getDimensionItemIds(object, 'dx'))).not.toEqual([])
    expect(resolvePeriods(getDimensionItemIds(object, 'pe'))).not.toEqual([])
    expect(resolveOrgUnits(getDimensionItemIds(object, 'ou'))).not.toEqual([])
}

describe('demo saved items', () => {
    it('builds every visualization on data, periods and org units the demo has', () => {
        for (const visualization of DEMO_VISUALIZATIONS) {
            expectToResolve(visualization)
        }
        expect(DEMO_VISUALIZATIONS.map(({ type }) => type)).toEqual([
            'LINE',
            'COLUMN',
            'PIVOT_TABLE',
            'LINE',
        ])
    })

    it('builds every map view the same way, with a legend set that exists', () => {
        for (const view of DEMO_MAPS.flatMap(({ mapViews }) => mapViews)) {
            expectToResolve(view)
            if (view.legendSet) {
                expect(getLegendSet(view.legendSet.id)).toBeDefined()
            }
        }
    })

    it('names each data item as the demo does', () => {
        const [first] = DEMO_VISUALIZATIONS[0].columns[0].items

        expect(first.name).toBe(getDataItem(first.id)?.name)
        expect(getLegendSet('nope')).toBeUndefined()
        expect(resolveDataItems(['nope'])).toEqual([])
    })
})
