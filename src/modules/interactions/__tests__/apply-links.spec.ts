import { DEMO_MAPS, DEMO_VISUALIZATIONS } from '@modules/demo/saved-items'
import { applyLinks } from '@modules/interactions/apply-links'
import type {
    MapObject,
    VisualizationObject,
} from '@modules/visualization/analytical-object'
import { getDimensionItemIds } from '@modules/visualization/analytical-object'
import { describe, expect, it } from 'vitest'

const OPTIONS = { orgUnitLevelCount: 3, orgUnitDepth: 1 } as const
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
})
