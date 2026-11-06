/* The demo's org unit shapes, traced from the land grid: a unit's outline
 * runs along the sides of its cells that face other cells. Every corner on
 * a border gets one position, jittered, then smoothed along the borders, so
 * the staircase of cell sides becomes a natural line, and the units that
 * meet there share their border exactly: neighbours leave no gap, and
 * children still tile their parent. */

import { SEA, type LandGrid, type Point } from './land-grid'

export type { Point } from './land-grid'
/* A polygon's outer ring, closed, in the demo's own 0-100 plane (y down) */
export type Ring = Point[]
/* A unit's rings, one per part (its mainland and its islands), as a
 * GeoJSON MultiPolygon has them */
export type Shape = Ring[]

const PLANE = 100
/* How far a corner moves at random, in cells */
const JITTER = 0.4
const SMOOTHING_PASSES = 8

type Side = [from: number, to: number]

/* A pseudo-random offset per corner, from -1 to 1 on each axis */
const jitterOf = (corner: number): Point => {
    const hash = (seed: number) => {
        let value = Math.imul(corner ^ seed, 0x45d9f3b)
        value = Math.imul(value ^ (value >>> 16), 0x45d9f3b)
        return (((value ^ (value >>> 16)) >>> 0) / 4294967295) * 2 - 1
    }
    return [hash(0x9e37), hash(0x7f4a)]
}

export const createShapes = (grid: LandGrid) => {
    const size = grid.length
    const cell = PLANE / size
    const width = size + 1
    /* Corners are numbered row by row */
    const cornerAt = (column: number, row: number) => row * width + column
    const labelAt = (column: number, row: number) => grid[row]?.[column] ?? SEA

    /* Each corner's neighbours along the borders between labels */
    const neighbours = new Map<number, number[]>()
    const addBorder = (a: number, b: number) => {
        neighbours.set(a, [...(neighbours.get(a) ?? []), b])
        neighbours.set(b, [...(neighbours.get(b) ?? []), a])
    }
    for (let row = 0; row <= size; row++) {
        for (let column = 0; column <= size; column++) {
            if (labelAt(column - 1, row) !== labelAt(column, row)) {
                addBorder(cornerAt(column, row), cornerAt(column, row + 1))
            }
            if (labelAt(column, row - 1) !== labelAt(column, row)) {
                addBorder(cornerAt(column, row), cornerAt(column + 1, row))
            }
        }
    }

    /* Junctions, where three borders or more meet, aren't jittered */
    const isOnLine = (corner: number) => neighbours.get(corner)?.length === 2
    let positions = new Map(
        [...neighbours.keys()].map((corner): [number, Point] => {
            const [jitterX, jitterY] = isOnLine(corner)
                ? jitterOf(corner)
                : [0, 0]
            return [
                corner,
                [
                    ((corner % width) + JITTER * jitterX) * cell,
                    (Math.floor(corner / width) + JITTER * jitterY) * cell,
                ],
            ]
        })
    )
    for (let pass = 0; pass < SMOOTHING_PASSES; pass++) {
        const previous = positions
        positions = new Map(
            [...previous].map(([corner, [x, y]]): [number, Point] => {
                const around = (neighbours.get(corner) as number[]).map(
                    (neighbour) => previous.get(neighbour) as Point
                )
                const [meanX, meanY] = [0, 1].map(
                    (axis) =>
                        around.reduce((sum, point) => sum + point[axis], 0) /
                        around.length
                )
                return [corner, [(x + meanX) / 2, (y + meanY) / 2]]
            })
        )
    }

    /* The outline of the cells with these labels: their sides that face
     * other cells, each walked clockwise, joined into a ring per part */
    return (labels: number[]): Shape => {
        const isInside = (column: number, row: number) =>
            labels.includes(labelAt(column, row))
        const outgoing = new Map<number, number[]>()
        const addSide = ([from, to]: Side) =>
            outgoing.set(from, [...(outgoing.get(from) ?? []), to])
        for (let row = 0; row < size; row++) {
            for (let column = 0; column < size; column++) {
                if (!isInside(column, row)) {
                    continue
                }
                const [topLeft, topRight, bottomRight, bottomLeft] = [
                    cornerAt(column, row),
                    cornerAt(column + 1, row),
                    cornerAt(column + 1, row + 1),
                    cornerAt(column, row + 1),
                ]
                const sides: [boolean, Side][] = [
                    [isInside(column, row - 1), [topLeft, topRight]],
                    [isInside(column + 1, row), [topRight, bottomRight]],
                    [isInside(column, row + 1), [bottomRight, bottomLeft]],
                    [isInside(column - 1, row), [bottomLeft, topLeft]],
                ]
                sides
                    .filter(([isShared]) => !isShared)
                    .forEach(([, side]) => addSide(side))
            }
        }
        return walkAllSides(outgoing).map((walk) =>
            walk.map((corner) => positions.get(corner) as Point)
        )
    }
}

/* One closed walk along the sides of each part (Hierholzer's algorithm):
 * where a shape pinches, two sides leave the same corner, and the walk
 * goes around one side of the pinch, then the other. The demo's units have
 * no holes, so each walk is a part's outer ring. */
const walkAllSides = (outgoing: Map<number, number[]>): number[][] =>
    [...outgoing.keys()].flatMap((start) => {
        if (!(outgoing.get(start) as number[]).length) {
            return []
        }
        const path = [start]
        const walk: number[] = []
        while (path.length) {
            const at = path[path.length - 1]
            const exits = outgoing.get(at) as number[]
            if (exits.length) {
                path.push(exits.pop() as number)
            } else {
                walk.push(path.pop() as number)
            }
        }
        return [walk.reverse()]
    })
