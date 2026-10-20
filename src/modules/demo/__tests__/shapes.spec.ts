import { SEA, type LandGrid } from '@modules/demo/land-grid'
import { createShapes, type Shape } from '@modules/demo/shapes'
import { describe, expect, it } from 'vitest'
import { areaOf } from './ring-area'

const _ = SEA
const distinct = (shape: Shape) =>
    new Set(shape.flat().map((point) => String(point)))

describe('createShapes', () => {
    it('draws cells side by side with one shared border, and no gap', () => {
        const grid: LandGrid = [
            [_, _, _, _],
            [_, 0, 1, _],
            [_, 0, 1, _],
            [_, _, _, _],
        ]
        const shapeOf = createShapes(grid)
        const [left, right, both] = [[0], [1], [0, 1]].map(shapeOf)

        for (const shape of [left, right, both]) {
            const [ring] = shape
            expect(shape).toHaveLength(1)
            expect(ring[0]).toEqual(ring[ring.length - 1])
        }
        expect(areaOf(left) + areaOf(right)).toBeCloseTo(areaOf(both))
        /* The corners along the shared border sit at the same points */
        const onRight = distinct(right)
        expect(
            [...distinct(left)].filter((point) => onRight.has(point))
        ).toHaveLength(3)
    })

    it.each([
        [
            'down',
            [
                [_, _, _, _],
                [_, 0, 1, _],
                [_, 1, 0, _],
                [_, _, _, _],
            ],
        ],
        [
            'up',
            [
                [_, _, _, _],
                [_, 1, 0, _],
                [_, 0, 1, _],
                [_, _, _, _],
            ],
        ],
    ])(
        'draws cells that touch at a corner (%s) as one ring through it',
        (_direction, grid: LandGrid) => {
            const shape = createShapes(grid)([0])

            /* Both cells' 4 corners, the shared one twice, and back to the
             * start */
            expect(shape).toHaveLength(1)
            expect(shape[0]).toHaveLength(4 + 4 + 1)
            expect(distinct(shape).size).toBe(7)
        }
    )

    it('draws a ring for each part, as for an island', () => {
        const grid: LandGrid = [
            [_, _, _, _, _],
            [_, 0, 1, _, _],
            [_, 0, 1, _, _],
            [_, _, _, _, _],
            [_, _, _, 0, _],
        ]
        const shape = createShapes(grid)([0])

        expect(shape).toHaveLength(2)
        for (const ring of shape) {
            expect(ring[0]).toEqual(ring[ring.length - 1])
        }
    })
})
