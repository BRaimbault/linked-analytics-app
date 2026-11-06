import type { Point } from './land-grid'
import type { Ring } from './shapes'

/* What a basemap shows around Demoland, made up as the island is, in the
 * same 0-100 plane (y down): a continent across a strait to the north and
 * east, the seas, a few rivers, roads and towns. Drawn under the data, as
 * Maps draws a basemap, with the island's own land too, so it still shows
 * where only some of its units are drawn. The continent reaches past the
 * plane, so the land goes on when the map is zoomed out. */

type Named = { name: string; at: Point }

/* A town, its name on the left of its dot where the right is out of view */
type Town = Named & { labelLeft?: boolean }

export type Basemap = {
    continent: { name: string; ring: Ring; labelAt: Point }
    waters: Named[]
    rivers: Point[][]
    roads: Point[][]
    towns: Town[]
}

export const BASEMAP: Basemap = {
    continent: {
        name: 'Ostland',
        labelAt: [42, 1],
        /* Its coast, west to east, then round the far side */
        ring: [
            [-120, -6],
            [-70, -10],
            [-30, -4],
            [0, -2],
            [22, 2],
            [40, 4],
            [56, 6],
            [72, 8],
            [88, 12],
            [99, 22],
            [104, 36],
            [108, 52],
            [116, 70],
            [134, 92],
            [170, 108],
            [240, 116],
            [240, -160],
            [-120, -160],
            [-120, -6],
        ],
    },
    waters: [
        { name: 'Demo Sea', at: [26, 92] },
        { name: 'Ostland Strait', at: [74, 16] },
    ],
    rivers: [
        [
            [10, -120],
            [18, -70],
            [28, -36],
            [34, -14],
            [38, 3],
        ],
        [
            [200, -70],
            [168, -20],
            [140, 30],
            [126, 60],
            [124, 79],
        ],
    ],
    roads: [
        [
            [-100, -30],
            [-30, -24],
            [30, -22],
            [90, -14],
            [118, 0],
            [190, 10],
        ],
        [
            [118, 0],
            [110, 22],
            [104, 30],
        ],
    ],
    towns: [
        { name: 'Kesh', at: [30, -22] },
        { name: 'Port Ostra', at: [104, 30], labelLeft: true },
    ],
}
