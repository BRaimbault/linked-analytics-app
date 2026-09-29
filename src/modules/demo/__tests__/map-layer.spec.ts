import { DATA_ITEM_IDS } from '@modules/demo/data-items'
import { buildDemoMapLayer } from '@modules/demo/map-layer'
import { DEMO_MAPS } from '@modules/demo/saved-items'
import { getTotal } from '@modules/demo/values'
import type { MapView } from '@modules/visualization/analytical-object'
import { describe, expect, it } from 'vitest'

const [pentaMap, malariaMap] = DEMO_MAPS.map(({ mapViews }) => mapViews[0])

const view = (overrides: Partial<MapView>): MapView => ({
    ...malariaMap,
    ...overrides,
})

describe('demo map layer', () => {
    it('makes a feature per org unit, with its value over the periods', () => {
        const layer = buildDemoMapLayer(malariaMap)

        expect(layer.features.map(({ orgUnit }) => orgUnit.name)).toEqual([
            'North',
            'West',
            'East',
            'South',
        ])
        expect(layer.features[0].value).toBe(
            getTotal(
                DATA_ITEM_IDS.malaria,
                ['DemoNorth01'],
                ['202605', '202606', '202607']
            )
        )
        expect(layer.dataItem?.name).toBe('Malaria cases confirmed')
        expect(layer.periodNames).toEqual(['Last 3 months'])
        /* The districts lie in the country, whose outline is drawn */
        expect(layer.outlines).toHaveLength(1)
    })

    it('colors by the color scale in equal intervals, low to high', () => {
        const layer = buildDemoMapLayer(malariaMap)
        const colors = (malariaMap.colorScale as string).split(',')
        const byValue = [...layer.features].sort(
            (a, b) => (a.value as number) - (b.value as number)
        )

        expect(byValue[0].color).toBe(colors[0])
        expect(byValue.at(-1)?.color).toBe(colors.at(-1))
        expect(layer.legend.map(({ color }) => color)).toEqual(colors)
        expect(layer.legend[0].label).toMatch(/^[\d,.]+ – [\d,.]+$/)
    })

    it('keeps given classes, values outside them taking the first or last', () => {
        const colors = (malariaMap.colorScale as string).split(',')
        const fitted = buildDemoMapLayer(malariaMap)
        const { min, max } = fitted.dataRange as { min: number; max: number }

        const wide = buildDemoMapLayer(malariaMap, { min: 0, max: max * 10 })
        const narrow = buildDemoMapLayer(malariaMap, {
            min: min + 1,
            max: min + 2,
        })

        expect(wide.legend[0].label).toBe(
            `0 – ${(max * 2).toLocaleString('en')}`
        )
        /* Every district in the first of five classes */
        expect(new Set(wide.features.map(({ color }) => color))).toEqual(
            new Set([colors[0]])
        )
        expect(narrow.features.map(({ color }) => color)).toContain(colors[0])
        expect(narrow.features.map(({ color }) => color)).toContain(
            colors.at(-1)
        )
        expect(wide.dataRange).toEqual(fitted.dataRange)
        expect(buildDemoMapLayer(pentaMap).dataRange).toBeNull()
    })

    it('colors by the legend set when the layer has one', () => {
        const layer = buildDemoMapLayer(pentaMap)

        expect(layer.features).toHaveLength(14)
        expect(layer.legend.map(({ label }) => label)).toEqual([
            'Low',
            'Medium',
            'High',
        ])
        for (const { value, color } of layer.features) {
            const expected =
                (value as number) < 50
                    ? '#d7301f'
                    : (value as number) < 80
                      ? '#fdae61'
                      : '#1a9850'
            expect(color).toBe(expected)
        }
        /* Chiefdoms lie in the 4 districts */
        expect(layer.outlines).toHaveLength(4)
    })

    it('falls back to the default scale and 5 classes, or as many as asked', () => {
        const defaults = buildDemoMapLayer(
            view({ colorScale: undefined, classes: undefined })
        )
        const three = buildDemoMapLayer(view({ classes: 3 }))

        expect(defaults.legend).toHaveLength(5)
        expect(three.legend).toHaveLength(3)
    })

    it('greys out units without a value, and a value outside every legend', () => {
        const noData = buildDemoMapLayer(
            view({ columns: [{ dimension: 'dx', items: [{ id: 'nope' }] }] })
        )
        const outOfLegend = buildDemoMapLayer(
            view({
                columns: [
                    { dimension: 'dx', items: [{ id: DATA_ITEM_IDS.malaria }] },
                ],
                legendSet: { id: 'DemoLegCov1' },
            })
        )

        expect(noData.dataItem).toBeNull()
        expect(noData.features.every(({ color }) => color === '#e0e0e0')).toBe(
            true
        )
        /* Malaria counts run far beyond the coverage legend's 1000 */
        expect(
            outOfLegend.features.some(({ color }) => color === '#e0e0e0')
        ).toBe(true)
    })

    it('draws a single unit, whatever its value, and a layer with nothing', () => {
        const single = buildDemoMapLayer(
            view({
                rows: [{ dimension: 'ou', items: [{ id: 'DemoLand001' }] }],
            })
        )
        const empty = buildDemoMapLayer(
            view({ rows: [], columns: [], filters: [] })
        )

        expect(single.features).toHaveLength(1)
        expect(single.outlines).toEqual([])
        expect(
            buildDemoMapLayer(
                view({
                    filters: [
                        {
                            dimension: 'pe',
                            items: [{ id: 'nope' }, { id: 'LAST_MONTH' }],
                        },
                    ],
                })
            ).periodNames
        ).toEqual(['Last month'])
        expect(empty.features).toEqual([])
        expect(empty.periodNames).toEqual([])
    })
})
