import { getTotal } from '@modules/demo/aggregation'
import { getAreaMean, getSurfaceValue } from '@modules/demo/climate'
import { DATA_ITEM_IDS } from '@modules/demo/data-items'
import { getOrgUnit, type DemoOrgUnit } from '@modules/demo/org-units'
import { getPeriod, type DemoPeriod } from '@modules/demo/periods'
import { describe, expect, it } from 'vitest'

const { precipitation, temperature, temperatureMax, temperatureMin } =
    DATA_ITEM_IDS
const SOUTH = 'DemoSouth01'
const NORTH = 'DemoNorth01'
const EAST = 'DemoEast001'
const HARBOR = 'DemoChS0101'
const JULY = '202607'
const QUARTER = '2026Q2'
const orgUnit = (id: string) => getOrgUnit(id) as DemoOrgUnit
const period = (id: string) => getPeriod(id) as DemoPeriod

describe('demo climate surfaces', () => {
    it('makes the hottest days hotter than the mean, and the coldest nights colder', () => {
        const point = orgUnit(SOUTH).cells[0]
        const month = period(JULY)
        const mean = getSurfaceValue('temperature_2m', point, month)

        expect(
            getSurfaceValue('temperature_2m_max', point, month)
        ).toBeGreaterThan(mean)
        expect(
            getSurfaceValue('temperature_2m_min', point, month)
        ).toBeLessThan(mean)
    })

    it('gives an org unit the mean of the surface over its cells, the same each time', () => {
        const harbor = orgUnit(HARBOR)
        const month = period(JULY)
        const cells = harbor.cells.map((cell) =>
            getSurfaceValue('total_precipitation_sum', cell, month)
        )
        const mean = cells.reduce((sum, value) => sum + value, 0) / cells.length

        const value = getAreaMean('total_precipitation_sum', harbor, month)

        expect(value).toBeCloseTo(mean, 1)
        expect(getAreaMean('total_precipitation_sum', harbor, month)).toBe(
            value
        )
    })
})

describe('demo climate data', () => {
    const months = ['202604', '202605', '202606']
    const monthly = (dataItemId: string, orgUnitId: string) =>
        months.map((id) => getTotal(dataItemId, [orgUnitId], [id]) as number)

    it('adds precipitation up over the months of a quarter', () => {
        const total = monthly(precipitation, SOUTH).reduce((a, b) => a + b, 0)

        expect(getTotal(precipitation, [SOUTH], [QUARTER])).toBeCloseTo(
            total,
            0
        )
    })

    it('averages temperature over the months, and takes the extremes of max and min', () => {
        const means = monthly(temperature, SOUTH)

        expect(getTotal(temperature, [SOUTH], [QUARTER])).toBeCloseTo(
            means.reduce((a, b) => a + b, 0) / means.length,
            0
        )
        expect(getTotal(temperatureMax, [SOUTH], [QUARTER])).toBe(
            Math.max(...monthly(temperatureMax, SOUTH))
        )
        expect(getTotal(temperatureMin, [SOUTH], [QUARTER])).toBe(
            Math.min(...monthly(temperatureMin, SOUTH))
        )
    })

    it("reads a district's own value, its area's mean, rather than its chiefdoms' total", () => {
        const district = getTotal(precipitation, [SOUTH], [JULY]) as number

        expect(district).toBe(
            getAreaMean('total_precipitation_sum', orgUnit(SOUTH), period(JULY))
        )
        expect(district).toBeLessThan(
            (getTotal(precipitation, [HARBOR], [JULY]) as number) * 2
        )
    })

    it('combines several org units by the aggregation type too', () => {
        const north = getTotal(temperature, [NORTH], [JULY]) as number
        const east = getTotal(temperature, [EAST], [JULY]) as number

        expect(getTotal(temperature, [NORTH, EAST], [JULY])).toBeCloseTo(
            (north + east) / 2,
            0
        )
    })

    it('has no weekly values, as it is imported monthly', () => {
        expect(getPeriod('2026W27')).toBeDefined()
        expect(getTotal(precipitation, [SOUTH], ['2026W27'])).toBeNull()
    })
})
