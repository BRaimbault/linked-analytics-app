import { DATA_ITEM_IDS, getDataItem } from '@modules/demo/data-items'
import { DEMO_MAPS, DEMO_VISUALIZATIONS } from '@modules/demo/saved-items'
import { applyLinks } from '@modules/interactions/apply-links'
import type {
    MapObject,
    VisualizationObject,
} from '@modules/visualization/analytical-object'
import { getDimensionItemIds } from '@modules/visualization/analytical-object'
import { describe, expect, it } from 'vitest'

const OPTIONS = {
    orgUnitLevelCount: 3,
    orgUnitDepth: 1,
    getLegendSetId: (id: string) => getDataItem(id)?.legendSetId,
} as const
const [ancLine, malariaByDistrict, , pentaTable] = DEMO_VISUALIZATIONS
const [pentaMap] = DEMO_MAPS

const north = {
    id: 'DemoNorth01',
    name: 'North',
    path: '/DemoLand001/DemoNorth01',
}
const harbor = {
    id: 'DemoChS0101',
    name: 'Harbor',
    path: '/DemoLand001/DemoSouth01/DemoChS0101',
}

const ids = (object: VisualizationObject, dimension: string) =>
    getDimensionItemIds(object, dimension)

describe('applyLinks', () => {
    it('keeps the object itself when nothing comes in, so nothing redraws', () => {
        expect(applyLinks(ancLine, {}, OPTIONS)).toBe(ancLine)
        expect(applyLinks(ancLine, { ou: [], pe: [] }, OPTIONS)).toBe(ancLine)
    })

    describe('org units', () => {
        it('puts the selection itself in a filter', () => {
            /* ANC visits: ou is a filter */
            const linked = applyLinks(ancLine, { ou: [north] }, OPTIONS)

            expect(linked.filters).toEqual([
                {
                    dimension: 'ou',
                    items: [{ id: 'DemoNorth01', name: 'North' }],
                },
            ])
            expect(linked.columns).toEqual(ancLine.columns)
        })

        it('shows the selection’s children on an axis', () => {
            /* Malaria by district: ou is the categories */
            const linked = applyLinks(
                malariaByDistrict,
                { ou: [north] },
                OPTIONS
            )

            expect(ids(linked, 'ou')).toEqual(['DemoNorth01', 'LEVEL-3'])
        })

        it('shows the selected org unit or its sub-x2-units, as the view asks', () => {
            const root = { id: 'DemoLand001', path: '/DemoLand001' }
            const itself = applyLinks(
                malariaByDistrict,
                { ou: [north] },
                { ...OPTIONS, orgUnitDepth: 0 }
            )
            const twoDown = applyLinks(
                malariaByDistrict,
                { ou: [root] },
                { ...OPTIONS, orgUnitDepth: 2 }
            )
            /* A district has only one level below it */
            const clamped = applyLinks(
                malariaByDistrict,
                { ou: [north] },
                { ...OPTIONS, orgUnitDepth: 2 }
            )

            expect(ids(itself, 'ou')).toEqual(['DemoNorth01'])
            expect(ids(twoDown, 'ou')).toEqual(['DemoLand001', 'LEVEL-3'])
            expect(ids(clamped, 'ou')).toEqual(['DemoNorth01', 'LEVEL-3'])
        })

        it('shows a unit at the deepest level itself, as it has no children', () => {
            const linked = applyLinks(pentaTable, { ou: [harbor] }, OPTIONS)

            expect(ids(linked, 'ou')).toEqual(['DemoChS0101'])
        })

        it('takes a unit without its path as itself', () => {
            const linked = applyLinks(
                malariaByDistrict,
                { ou: [{ id: 'DemoNorth01' }] },
                OPTIONS
            )

            expect(ids(linked, 'ou')).toEqual(['DemoNorth01'])
        })
    })

    describe('periods', () => {
        it('puts the selection in a filter', () => {
            const linked = applyLinks(
                malariaByDistrict,
                { pe: [{ id: '2025Q4', name: 'October - December 2025' }] },
                OPTIONS
            )

            expect(linked.filters).toEqual([
                {
                    dimension: 'pe',
                    items: [{ id: '2025Q4', name: 'October - December 2025' }],
                },
            ])
        })

        it('splits it into the axis’s own periods, or takes the one containing it', () => {
            /* ANC visits: a monthly axis (last 12 months) */
            const byQuarter = applyLinks(
                ancLine,
                { pe: [{ id: '2025Q4' }] },
                OPTIONS
            )
            /* Penta 3: a quarterly axis (last 4 quarters) */
            const byMonth = applyLinks(
                pentaTable,
                { pe: [{ id: '202511' }] },
                OPTIONS
            )

            expect(ids(byQuarter, 'pe')).toEqual(['202510', '202511', '202512'])
            expect(ids(byMonth, 'pe')).toEqual(['2025Q4'])
        })

        it('puts periods of a type it can’t convert on the axis as they are', () => {
            const weekly = applyLinks(
                {
                    ...ancLine,
                    rows: [
                        { dimension: 'pe', items: [{ id: 'LAST_52_WEEKS' }] },
                    ],
                },
                { pe: [{ id: '2025' }] },
                OPTIONS
            )
            const emptyAxis = applyLinks(
                { ...ancLine, rows: [{ dimension: 'pe', items: [] }] },
                { pe: [{ id: '2025' }] },
                OPTIONS
            )

            expect(ids(weekly, 'pe')).toEqual(['2025'])
            expect(ids(emptyAxis, 'pe')).toEqual(['2025'])
        })

        it('adds a dimension the object lacks to its filters, and joins repeats', () => {
            const linked = applyLinks(
                {
                    ...ancLine,
                    rows: [{ dimension: 'pe', items: [{ id: 'THIS_YEAR' }] }],
                    filters: [],
                },
                { ou: [north], pe: [{ id: '202501' }, { id: '202502' }] },
                OPTIONS
            )

            expect(linked.filters).toEqual([
                {
                    dimension: 'ou',
                    items: [{ id: 'DemoNorth01', name: 'North' }],
                },
            ])
            expect(ids(linked, 'pe')).toEqual(['2025'])
        })
    })

    it('clears a custom title and subtitle, which would go stale', () => {
        const linked = applyLinks(
            { ...ancLine, title: 'ANC in 2025', subtitle: 'All districts' },
            { pe: [{ id: '2026' }] },
            OPTIONS
        )

        expect(linked).not.toHaveProperty('title')
        expect(linked).not.toHaveProperty('subtitle')
        expect(linked.name).toBe(ancLine.name)
    })

    it('rewrites each thematic layer of a map, and leaves the others', () => {
        const map: MapObject = {
            ...pentaMap,
            mapViews: [
                ...pentaMap.mapViews,
                { ...pentaMap.mapViews[0], id: 'boundaries', layer: 'orgUnit' },
            ],
        }

        const linked = applyLinks(
            map,
            { ou: [north], pe: [{ id: '2025' }] },
            OPTIONS
        )
        const [thematic, boundaries] = linked.mapViews

        /* A choropleth shows the district's chiefdoms */
        expect(getDimensionItemIds(thematic, 'ou')).toEqual([
            'DemoNorth01',
            'LEVEL-3',
        ])
        expect(getDimensionItemIds(thematic, 'pe')).toEqual(['2025'])
        expect(boundaries).toBe(map.mapViews[1])
    })

    describe('data items', () => {
        const anc1 = { id: DATA_ITEM_IDS.anc1, name: 'ANC 1st visit' }
        const penta3 = { id: DATA_ITEM_IDS.penta3, name: 'Penta 3' }
        const malaria = { id: DATA_ITEM_IDS.malaria, name: 'Malaria' }

        it('replaces the one data item of a view, on an axis or in a filter', () => {
            const columns = applyLinks(
                malariaByDistrict,
                { dx: [penta3] },
                OPTIONS
            )
            const table = applyLinks(pentaTable, { dx: [malaria] }, OPTIONS)

            expect(columns.columns).toEqual([
                { dimension: 'dx', items: [penta3] },
            ])
            expect(ids(table, 'dx')).toEqual([DATA_ITEM_IDS.malaria])
        })

        it('narrows a view comparing data items to those of its own picked, or leaves it', () => {
            /* ANC visits compares ANC 1 and ANC 4 */
            const narrowed = applyLinks(
                ancLine,
                { dx: [malaria, anc1] },
                OPTIONS
            )
            const untouched = applyLinks(ancLine, { dx: [malaria] }, OPTIONS)

            expect(ids(narrowed, 'dx')).toEqual([DATA_ITEM_IDS.anc1])
            expect(ids(untouched, 'dx')).toEqual(ids(ancLine, 'dx'))
        })

        it('adds no data item to a view without one', () => {
            const noData = { ...malariaByDistrict, columns: [] }

            const linked = applyLinks(noData, { dx: [malaria] }, OPTIONS)

            expect(ids(linked, 'dx')).toEqual([])
        })

        it('shows one data item on a map layer, with its own legend set or automatic classes', () => {
            const [, malariaMap] = DEMO_MAPS
            const layerOf = (map: MapObject) => map.mapViews[0]
            const withLegend: MapObject = {
                ...malariaMap,
                mapViews: [
                    { ...layerOf(malariaMap), legendSet: { id: 'Other' } },
                ],
            }

            /* Penta 3 coverage has a legend set; malaria cases have none */
            const toMalaria = layerOf(
                applyLinks(pentaMap, { dx: [malaria, anc1] }, OPTIONS)
            )
            const toPenta = layerOf(
                applyLinks(withLegend, { dx: [penta3] }, OPTIONS)
            )
            const automatic = layerOf(
                applyLinks(malariaMap, { dx: [penta3] }, OPTIONS)
            )
            const same = layerOf(
                applyLinks(pentaMap, { dx: [penta3] }, OPTIONS)
            )

            expect(getDimensionItemIds(toMalaria, 'dx')).toEqual([
                DATA_ITEM_IDS.malaria,
            ])
            expect(toMalaria).not.toHaveProperty('legendSet')
            expect(toPenta.legendSet).toEqual({ id: 'DemoLegCov1' })
            expect(automatic).not.toHaveProperty('legendSet')
            expect(same.legendSet).toEqual(layerOf(pentaMap).legendSet)
        })
    })
})
