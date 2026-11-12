import type { Ring, Shape } from '@modules/demo/shapes'

/* A closed ring's area, by the shoelace formula */
const areaOfRing = (ring: Ring) =>
    Math.abs(
        ring
            .slice(0, -1)
            .reduce(
                (sum, [x, y], index) =>
                    sum + x * ring[index + 1][1] - ring[index + 1][0] * y,
                0
            ) / 2
    )

/* The area of all a shape's parts */
export const areaOf = (shape: Shape) =>
    shape.reduce((sum, ring) => sum + areaOfRing(ring), 0)
