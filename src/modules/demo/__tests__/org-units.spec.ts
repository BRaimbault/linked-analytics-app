import {
    getChildren,
    getLeafIds,
    getOrgUnit,
    ORG_UNIT_GROUPS,
    ORG_UNIT_LEVELS,
    ORG_UNITS,
    resolveOrgUnits,
    ROOT_ORG_UNIT_ID,
} from '@modules/demo/org-units'
import type { Shape } from '@modules/demo/shapes'
import { describe, expect, it } from 'vitest'
import { areaOf } from './ring-area'

const ids = (items: string[]) => resolveOrgUnits(items).map(({ id }) => id)

const boundsOf = (shape: Shape) => {
    const points = shape.flat()
    return {
        left: Math.min(...points.map(([x]) => x)),
        right: Math.max(...points.map(([x]) => x)),
        top: Math.min(...points.map(([, y]) => y)),
        bottom: Math.max(...points.map(([, y]) => y)),
    }
}

const shapeOf = (id: string) => getOrgUnit(id)?.shape as Shape

describe('demo org units', () => {
    it('makes a country of 4 districts and 14 chiefdoms, on 3 levels', () => {
        const count = (level: number) =>
            ORG_UNITS.filter((orgUnit) => orgUnit.level === level).length

        expect([count(1), count(2), count(3)]).toEqual([1, 4, 14])
        expect(getChildren(ROOT_ORG_UNIT_ID).map(({ name }) => name)).toEqual([
            'North',
            'West',
            'East',
            'South',
        ])
    })

    it('gives every unit an 11-character id, its path and its level’s UID', () => {
        for (const orgUnit of ORG_UNITS) {
            expect(orgUnit.id).toMatch(/^[A-Za-z][A-Za-z0-9]{10}$/)
            const parent = orgUnit.parentId && getOrgUnit(orgUnit.parentId)
            expect(orgUnit.path).toBe(
                `${parent ? parent.path : ''}/${orgUnit.id}`
            )
            expect(orgUnit.levelId).toBe(ORG_UNIT_LEVELS[orgUnit.level - 1].id)
        }
    })

    it('tiles each district with its chiefdoms, and the country with its districts', () => {
        for (const parent of ORG_UNITS.filter(({ level }) => level < 3)) {
            const children = getChildren(parent.id)
            const outer = boundsOf(parent.shape)
            const childrenArea = children.reduce(
                (sum, child) => sum + areaOf(child.shape),
                0
            )

            expect(childrenArea).toBeCloseTo(areaOf(parent.shape))
            for (const child of children) {
                const inner = boundsOf(child.shape)
                expect(inner.left).toBeGreaterThanOrEqual(outer.left)
                expect(inner.right).toBeLessThanOrEqual(outer.right)
                expect(inner.top).toBeGreaterThanOrEqual(outer.top)
                expect(inner.bottom).toBeLessThanOrEqual(outer.bottom)
            }
        }
    })

    it('draws each part of a unit as an unbroken outline inside the plane', () => {
        for (const { shape } of ORG_UNITS) {
            const bounds = boundsOf(shape)
            for (const ring of shape) {
                const steps = ring
                    .slice(1)
                    .map(([x, y], index) =>
                        Math.hypot(x - ring[index][0], y - ring[index][1])
                    )

                expect(ring[0]).toEqual(ring[ring.length - 1])
                expect(Math.max(...steps)).toBeLessThan(3)
            }
            expect(Math.min(bounds.left, bounds.top)).toBeGreaterThan(0)
            expect(Math.max(bounds.right, bounds.bottom)).toBeLessThan(100)
        }
    })

    it('makes Juniper an island, off the mainland', () => {
        const parts = (id: string) => shapeOf(id).length

        expect(parts('DemoChS0103')).toBe(1)
        expect([parts('DemoSouth01'), parts(ROOT_ORG_UNIT_ID)]).toEqual([2, 2])
        for (const { id } of ORG_UNITS.filter(
            ({ id }) => !['DemoChS0103', 'DemoSouth01'].includes(id)
        ).filter(({ level }) => level > 1)) {
            expect(parts(id)).toBe(1)
        }
    })

    it('gives the country a bay, so its outline is concave', () => {
        const country = shapeOf(ROOT_ORG_UNIT_ID)
        const { left, right, top, bottom } = boundsOf(country)

        expect(areaOf(country)).toBeLessThan(
            0.75 * (right - left) * (bottom - top)
        )
    })

    it('finds the chiefdoms under a unit, or the chiefdom itself', () => {
        expect(getLeafIds(ROOT_ORG_UNIT_ID)).toHaveLength(14)
        expect(getLeafIds('DemoNorth01')).toEqual([
            'DemoChN0101',
            'DemoChN0102',
            'DemoChN0103',
        ])
        expect(getLeafIds('DemoChN0101')).toEqual(['DemoChN0101'])
    })

    it('splits the chiefdoms into urban and rural groups', () => {
        const [urban, rural] = ORG_UNIT_GROUPS

        expect(urban.memberIds.length + rural.memberIds.length).toBe(14)
        expect(urban.memberIds.some((id) => rural.memberIds.includes(id))).toBe(
            false
        )
    })

    describe('resolving ou items', () => {
        it('takes picked units, and the user’s, as the demo user at the country', () => {
            expect(ids(['DemoWest001', 'DemoChN0101'])).toEqual([
                'DemoWest001',
                'DemoChN0101',
            ])
            expect(ids(['USER_ORGUNIT'])).toEqual([ROOT_ORG_UNIT_ID])
            expect(ids(['USER_ORGUNIT_CHILDREN'])).toHaveLength(4)
            expect(ids(['USER_ORGUNIT_GRANDCHILDREN'])).toHaveLength(14)
        })

        it('takes a level within the units picked with it, or in the whole tree', () => {
            expect(ids(['LEVEL-2'])).toHaveLength(4)
            expect(ids(['USER_ORGUNIT', 'LEVEL-3'])).toHaveLength(14)
            expect(ids(['DemoSouth01', 'LEVEL-3'])).toEqual(
                getLeafIds('DemoSouth01')
            )
            /* A level by its UID, as DHIS2 also writes it */
            expect(ids(['LEVEL-DemoLevel02'])).toHaveLength(4)
        })

        it('takes a group within the units picked with it', () => {
            expect(ids(['OU_GROUP-DemoGrpUrb1'])).toHaveLength(4)
            expect(ids(['DemoNorth01', 'OU_GROUP-DemoGrpUrb1'])).toEqual([
                'DemoChN0103',
            ])
        })

        it('drops unknown ids and repeats', () => {
            expect(ids(['nope', 'DemoWest001', 'DemoWest001'])).toEqual([
                'DemoWest001',
            ])
            expect(ids(['LEVEL-9', 'OU_GROUP-nope', 'LEVEL-x'])).toEqual([])
        })
    })
})
