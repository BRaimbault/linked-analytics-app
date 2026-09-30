/* The demo's land, as a grid of cells over its 0-100 plane (y down): each
 * land cell belongs to the seed nearest to it, the rest is sea. The coast
 * is a wobbly circle with a bay and a peninsula, so the land is concave.
 * Distances to the seeds are measured in a bent plane, so the borders
 * between seeds' cells curve instead of running straight. */

export type Point = [number, number]
/* grid[row][column]: the index of the cell's seed, or SEA */
export type LandGrid = number[][]

export const SEA = -1
const GRID_SIZE = 64
const PLANE = 100
const CENTRE = PLANE / 2

/* How close an angle lies to another, from 1 (on it) to 0 (far) */
const bump = (angle: number, at: number, width: number) => {
    const difference = Math.atan2(Math.sin(angle - at), Math.cos(angle - at))
    return Math.exp(-((difference / width) ** 2))
}

/* The land is a tilted oval, long from south-west to north-east */
const TILT = -0.45
const HALF_LENGTH = 40
const HALF_WIDTH = 25

/* The coast's distance from the centre, as a share of the oval's, by
 * angle around the oval (0 along its length, to the north-east): a bay in
 * the south-east, a peninsula to the south-west and a cape in the north */
const coastShare = (angle: number) =>
    1 +
    0.08 * Math.sin(2 * angle + 0.5) +
    0.06 * Math.sin(3 * angle + 1.3) +
    0.04 * Math.sin(5 * angle + 2) +
    0.02 * Math.sin(11 * angle + 0.3) -
    0.5 * bump(angle, 1.3, 0.3) +
    0.28 * bump(angle, 2.75, 0.18) +
    0.15 * bump(angle, -0.9, 0.15)

/* Straight land borders with neighbouring countries, each from one point
 * to another, the land on their right as one walks them (y down) */
const LAND_BORDERS: [Point, Point][] = [
    [
        [16, 44],
        [42, 22],
    ],
    [
        [86, 16],
        [84, 64],
    ],
]

const isWithinLandBorders = ([x, y]: Point) =>
    LAND_BORDERS.every(
        ([[fromX, fromY], [toX, toY]]) =>
            (toX - fromX) * (y - fromY) - (toY - fromY) * (x - fromX) > 0
    )

const isLand = ([x, y]: Point) => {
    if (!isWithinLandBorders([x, y])) {
        return false
    }
    const [dx, dy] = [x - CENTRE, y - CENTRE]
    const along = (dx * Math.cos(TILT) + dy * Math.sin(TILT)) / HALF_LENGTH
    const across = (dy * Math.cos(TILT) - dx * Math.sin(TILT)) / HALF_WIDTH
    return Math.hypot(along, across) < coastShare(Math.atan2(across, along))
}

const bend = ([x, y]: Point): Point => [
    x + 6 * Math.sin(0.09 * y + 0.8) + 2 * Math.sin(0.21 * x + 0.23 * y + 2),
    y + 6 * Math.sin(0.08 * x + 2.2) + 2 * Math.sin(0.19 * x + 0.25 * y + 4),
]

const distancesTo = ([x, y]: Point, seeds: Point[]) =>
    seeds.map(([seedX, seedY]) => Math.hypot(seedX - x, seedY - y))

/* The seed nearest to a point in the bent plane. Two seeds whose border is
 * straight, as borders drawn with a ruler are, split the land they have
 * between them by their nearness in the plain plane. */
const nearestSeed = (
    point: Point,
    seeds: Point[],
    straightBorders: [number, number][] = []
) => {
    const distances = distancesTo(bend(point), seeds)
    const nearest = distances.indexOf(Math.min(...distances))
    const pair = straightBorders.find((indices) => indices.includes(nearest))
    if (!pair) {
        return nearest
    }
    const [toFirst, toSecond] = distancesTo(
        point,
        pair.map((index) => seeds[index])
    )
    return toFirst <= toSecond ? pair[0] : pair[1]
}

/* An island off the south coast */
const ISLAND: Point = [52, 83]
const ISLAND_RADIUS = 5.5

const isOnIsland = ([x, y]: Point) => {
    const angle = Math.atan2(y - ISLAND[1], x - ISLAND[0])
    const radius =
        ISLAND_RADIUS *
        (1 + 0.15 * Math.sin(3 * angle + 1) + 0.08 * Math.sin(5 * angle + 2))
    return Math.hypot(x - ISLAND[0], y - ISLAND[1]) < radius
}

/* Each seed's land around it, in a GRID_SIZE × GRID_SIZE grid. The seed
 * nearest the island has all of it, and nothing on the mainland. Pairs of
 * seeds in straightBorders (by index) meet along a straight line. */
export const createLandGrid = (
    seeds: Point[],
    straightBorders: [number, number][]
): LandGrid => {
    const cell = PLANE / GRID_SIZE
    const islandSeed = nearestSeed(ISLAND, seeds)
    const mainlandSeeds = seeds.map((seed, index): Point =>
        index === islandSeed ? [Infinity, Infinity] : seed
    )
    return Array.from({ length: GRID_SIZE }, (_, row) =>
        Array.from({ length: GRID_SIZE }, (__, column) => {
            const centre: Point = [(column + 0.5) * cell, (row + 0.5) * cell]
            if (isOnIsland(centre)) {
                return islandSeed
            }
            return isLand(centre)
                ? nearestSeed(centre, mainlandSeeds, straightBorders)
                : SEA
        })
    )
}
