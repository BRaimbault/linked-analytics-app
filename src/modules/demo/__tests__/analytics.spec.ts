import { getTotal, getValue } from '@modules/demo/aggregation'
import { buildDemoTable, toDataClick } from '@modules/demo/analytics'
import { DATA_ITEM_IDS } from '@modules/demo/data-items'
import type { VisualizationObject } from '@modules/visualization/analytical-object'
import { describe, expect, it } from 'vitest'

const { anc1, anc4, malaria } = DATA_ITEM_IDS

const visualization = (
    layout: Partial<VisualizationObject>
): VisualizationObject => ({
    name: 'Test',
    type: 'COLUMN',
    columns: [],
    rows: [],
    filters: [],
    ...layout,
})

const dimension = (name: string, ...ids: string[]) => ({
    dimension: name,
    items: ids.map((id) => ({ id })),
})

describe('demo analytics', () => {
    it('lays series out from columns and categories from rows, named', () => {
        const table = buildDemoTable(
            visualization({
                columns: [dimension('dx', anc1, anc4)],
                rows: [dimension('pe', 'LAST_3_MONTHS')],
                filters: [dimension('ou', 'USER_ORGUNIT')],
            })
        )

        expect(table.series.map(({ name }) => name)).toEqual([
            'ANC 1st visit',
            'ANC 4th or more visits',
        ])
        expect(table.categories.map(({ id }) => id)).toEqual([
            '202605',
            '202606',
            '202607',
        ])
        expect(table.valueOf(table.series[0], table.categories[0])).toBe(
            getValue(anc1, 'DemoLand001', '202605')
        )
    })

    it('filters each value by the other dimensions, their items taken together', () => {
        const table = buildDemoTable(
            visualization({
                columns: [dimension('dx', malaria)],
                rows: [dimension('ou', 'USER_ORGUNIT_CHILDREN')],
                filters: [dimension('pe', '202601', '202602')],
            })
        )
        const [north] = table.categories

        expect(north).toMatchObject({
            id: 'DemoNorth01',
            path: '/DemoLand001/DemoNorth01',
            levelId: 'DemoLevel02',
        })
        expect(table.valueOf(table.series[0], north)).toBe(
            getTotal(malaria, ['DemoNorth01'], ['202601', '202602'])
        )
        expect(
            table.filters.map((items) => items.map(({ name }) => name))
        ).toEqual([['January 2026', 'February 2026']])
    })

    it('names a relative period filter by its own name, not its months', () => {
        const table = buildDemoTable(
            visualization({
                columns: [dimension('dx', malaria)],
                rows: [dimension('ou', 'USER_ORGUNIT_CHILDREN')],
                filters: [dimension('pe', 'LAST_12_MONTHS', 'nope')],
            })
        )

        expect(table.filters).toEqual([
            [{ dimension: 'pe', id: 'LAST_12_MONTHS', name: 'Last 12 months' }],
        ])
    })

    it('adds up several data items in a filter', () => {
        const table = buildDemoTable(
            visualization({
                columns: [dimension('ou', 'DemoWest001')],
                rows: [dimension('pe', '2025')],
                filters: [dimension('dx', anc1, anc4)],
            })
        )

        expect(table.valueOf(table.series[0], table.categories[0])).toBe(
            (getValue(anc1, 'DemoWest001', '2025') as number) +
                (getValue(anc4, 'DemoWest001', '2025') as number)
        )
    })

    it('has no value without data, or without a period or org unit the demo knows', () => {
        const noData = buildDemoTable(
            visualization({
                columns: [dimension('ou', 'DemoWest001')],
                rows: [dimension('pe', '2025')],
            })
        )
        const unknownPeriod = buildDemoTable(
            visualization({
                columns: [dimension('dx', anc1)],
                rows: [dimension('ou', 'DemoWest001')],
                filters: [dimension('pe', '1999')],
            })
        )

        expect(noData.valueOf(noData.series[0], noData.categories[0])).toBe(
            null
        )
        expect(
            unknownPeriod.valueOf(
                unknownPeriod.series[0],
                unknownPeriod.categories[0]
            )
        ).toBe(null)
    })

    it('leaves out dimensions the demo doesn’t know, and empty axes', () => {
        const table = buildDemoTable(
            visualization({
                columns: [dimension('Xyz', 'a'), dimension('dx', anc1)],
                filters: [dimension('ou', 'USER_ORGUNIT')],
            })
        )

        expect(table.series.map(({ id }) => id)).toEqual([anc1])
        expect(table.categories).toEqual([])
        expect(
            buildDemoTable(visualization({ rows: [dimension('pe', '2025')] }))
                .series
        ).toEqual([])
    })

    it('sends a clicked point’s axes as ids, an org unit with its path and level', () => {
        const table = buildDemoTable(
            visualization({
                columns: [dimension('dx', malaria)],
                rows: [dimension('ou', 'DemoChS0101')],
                filters: [dimension('pe', '2025')],
            })
        )

        expect(toDataClick(table.series[0], table.categories[0])).toEqual({
            dx: { id: malaria, name: 'Malaria cases confirmed' },
            ou: {
                id: 'DemoChS0101',
                name: 'Harbor',
                path: '/DemoLand001/DemoSouth01/DemoChS0101',
                level: 'DemoLevel03',
            },
        })
    })
})
