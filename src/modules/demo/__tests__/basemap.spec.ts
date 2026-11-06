import { BASEMAP } from '@modules/demo/basemap'
import { getOrgUnit, ROOT_ORG_UNIT_ID } from '@modules/demo/org-units'
import { describe, expect, it } from 'vitest'

describe('demo basemap', () => {
    it('closes the continent, and names it inside its bounds', () => {
        const { ring, labelAt } = BASEMAP.continent
        expect(ring.at(-1)).toEqual(ring[0])
        const xs = ring.map(([x]) => x)
        const ys = ring.map(([, y]) => y)
        expect(labelAt[0]).toBeGreaterThan(Math.min(...xs))
        expect(labelAt[0]).toBeLessThan(Math.max(...xs))
        expect(labelAt[1]).toBeGreaterThan(Math.min(...ys))
        expect(labelAt[1]).toBeLessThan(Math.max(...ys))
    })

    it('leaves a strait between the continent and the island', () => {
        /* The continent's coast is the part of its ring inside the plane */
        const coast = BASEMAP.continent.ring.filter(
            ([x, y]) => x > -10 && x < 140 && y > -10
        )
        const island = getOrgUnit(ROOT_ORG_UNIT_ID)?.shape.flat() ?? []
        const nearest = Math.min(
            ...island.flatMap(([x, y]) =>
                coast.map(([coastX, coastY]) =>
                    Math.hypot(coastX - x, coastY - y)
                )
            )
        )

        expect(nearest).toBeGreaterThan(5)
    })

    it('runs every river and road along several points', () => {
        for (const line of [...BASEMAP.rivers, ...BASEMAP.roads]) {
            expect(line.length).toBeGreaterThan(2)
        }
    })
})
