/* The parts of a saved visualization or map that this app reads and
 * rewrites: its dimensions, laid out as DHIS2 lays them out. The real
 * objects carry many more fields, which pass through untouched. */

export type DimensionItem = { id: string; name?: string }

export type Dimension = { dimension: string; items: DimensionItem[] }

type LaidOut = {
    columns: Dimension[]
    rows: Dimension[]
    filters: Dimension[]
}

export type VisualizationType = 'COLUMN' | 'LINE' | 'PIVOT_TABLE'

export type VisualizationObject = LaidOut & {
    id?: string
    name: string
    type: VisualizationType
    /* Custom texts; without them DV names the chart and builds its
     * subtitle from the filters */
    title?: string
    subtitle?: string
}

/* A map view is one layer; a thematic layer keeps dx in columns, ou in
 * rows and pe in filters */
export type MapView = LaidOut & {
    id?: string
    /* The demo draws thematic layers only; links rewrite only those */
    layer: 'thematic' | 'orgUnit' | 'facility' | 'earthEngine' | 'event'
    name?: string
    /* A color scale as DHIS2 stores it: colors joined by commas */
    colorScale?: string
    classes?: number
    legendSet?: { id: string }
}

export type MapObject = {
    id?: string
    name: string
    mapViews: MapView[]
}

export const DIMENSIONS = { data: 'dx', period: 'pe', orgUnit: 'ou' } as const

/* Where a dimension sits, if anywhere in the object */
export const findDimension = (
    object: LaidOut,
    dimension: string
): Dimension | undefined =>
    [...object.columns, ...object.rows, ...object.filters].find(
        (entry) => entry.dimension === dimension
    )

export const getDimensionItemIds = (
    object: LaidOut,
    dimension: string
): string[] => findDimension(object, dimension)?.items.map(({ id }) => id) ?? []
