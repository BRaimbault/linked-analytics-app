/* The demo's org unit tree: a made-up country, 4 districts and 14
 * chiefdoms, with levels and groups as DHIS2 has them. Names are made up
 * on purpose, so the demo's numbers can't pass for real health data. Ids
 * look like DHIS2 UIDs (11 characters), so objects built on them look real
 * to the pickers. */

import { createLandGrid, type Point } from './land-grid'
import { createShapes, type Shape } from './shapes'

export type DemoOrgUnitLevel = { id: string; level: number; name: string }

export type DemoOrgUnit = {
    id: string
    name: string
    level: number
    /* The level's UID, as DV's onDrill reports it */
    levelId: string
    /* Ancestors and itself, as DHIS2 writes it: /root/.../id */
    path: string
    parentId: string | null
    shape: Shape
}

export type DemoOrgUnitGroup = { id: string; name: string; memberIds: string[] }

export const ORG_UNIT_LEVELS: DemoOrgUnitLevel[] = [
    { id: 'DemoLevel01', level: 1, name: 'National' },
    { id: 'DemoLevel02', level: 2, name: 'District' },
    { id: 'DemoLevel03', level: 3, name: 'Chiefdom' },
]

const COUNTRY = { id: 'DemoLand001', name: 'Demoland' }

/* Each chiefdom has its id, name and seed: the land nearest to the seed is
 * the chiefdom's (see land-grid.ts). The mainland runs from a peninsula in
 * the south-west to the north-east, with a bay in the south-east; Juniper
 * is the island off the south coast. */
const DISTRICTS: {
    id: string
    name: string
    chiefdoms: [string, string, Point][]
}[] = [
    {
        id: 'DemoNorth01',
        name: 'North',
        chiefdoms: [
            ['DemoChN0101', 'Amber Hills', [30, 38]],
            ['DemoChN0102', 'Birch Valley', [47, 29]],
            ['DemoChN0103', 'Cedar Coast', [63, 24]],
        ],
    },
    {
        id: 'DemoWest001',
        name: 'West',
        chiefdoms: [
            ['DemoChW0101', 'Kestrel', [15, 55]],
            ['DemoChW0102', 'Lark Meadow', [30, 49]],
            ['DemoChW0103', 'Maple Point', [24, 64]],
            ['DemoChW0104', 'Nettle Hill', [43, 48]],
        ],
    },
    {
        id: 'DemoEast001',
        name: 'East',
        chiefdoms: [
            ['DemoChE0101', 'Dawn Plains', [60, 40]],
            ['DemoChE0102', 'Elm Ridge', [78, 30]],
            ['DemoChE0103', 'Fern Lake', [72, 50]],
            ['DemoChE0104', 'Granite Bay', [81, 42]],
        ],
    },
    {
        id: 'DemoSouth01',
        name: 'South',
        chiefdoms: [
            ['DemoChS0101', 'Harbor', [20, 76]],
            ['DemoChS0102', 'Iris Fields', [38, 68]],
            ['DemoChS0103', 'Juniper', [52, 83]],
        ],
    },
]

/* Borders drawn with a ruler, as some are */
const STRAIGHT_BORDERS: [string, string][] = [
    ['DemoChN0102', 'DemoChN0103'],
    ['DemoChW0101', 'DemoChW0102'],
    ['DemoChW0104', 'DemoChE0101'],
]

const CHIEFDOMS = DISTRICTS.flatMap(({ chiefdoms }) => chiefdoms)
const indicesOf = (ids: string[]) =>
    ids.map((id) => CHIEFDOMS.findIndex(([chiefdomId]) => chiefdomId === id))
const shapeOf = createShapes(
    createLandGrid(
        CHIEFDOMS.map(([, , seed]) => seed),
        STRAIGHT_BORDERS.map((pair) => indicesOf(pair) as [number, number])
    )
)
const shapeOfChiefdoms = (ids: string[]) => shapeOf(indicesOf(ids))

type Placed = {
    id: string
    name: string
    parentId: string | null
    chiefdomIds: string[]
}

/* Parents before their children */
const PLACED: Placed[] = [
    {
        ...COUNTRY,
        parentId: null,
        chiefdomIds: CHIEFDOMS.map(([id]) => id),
    },
    ...DISTRICTS.flatMap(({ id, name, chiefdoms }) => [
        {
            id,
            name,
            parentId: COUNTRY.id,
            chiefdomIds: chiefdoms.map(([chiefdomId]) => chiefdomId),
        },
        ...chiefdoms.map(([chiefdomId, chiefdomName]) => ({
            id: chiefdomId,
            name: chiefdomName,
            parentId: id,
            chiefdomIds: [chiefdomId],
        })),
    ]),
]

export const ORG_UNITS: DemoOrgUnit[] = PLACED.reduce<DemoOrgUnit[]>(
    (units, { id, name, parentId, chiefdomIds }) => {
        const parent = units.find((orgUnit) => orgUnit.id === parentId)
        const level = parent ? parent.level + 1 : 1
        return [
            ...units,
            {
                id,
                name,
                level,
                levelId: ORG_UNIT_LEVELS[level - 1].id,
                path: `${parent?.path ?? ''}/${id}`,
                parentId,
                shape: shapeOfChiefdoms(chiefdomIds),
            },
        ]
    },
    []
)

const COUNTRY_UNIT = ORG_UNITS[0]

export const ROOT_ORG_UNIT_ID = COUNTRY_UNIT.id

const byId = new Map(ORG_UNITS.map((orgUnit) => [orgUnit.id, orgUnit]))

export const getOrgUnit = (id: string): DemoOrgUnit | undefined => byId.get(id)

export const getChildren = (id: string): DemoOrgUnit[] =>
    ORG_UNITS.filter((orgUnit) => orgUnit.parentId === id)

/* The chiefdoms under a unit, or the unit itself for a chiefdom: the
 * leaves values are made for */
export const getLeafIds = (id: string): string[] => {
    const children = getChildren(id)
    return children.length
        ? children.flatMap((child) => getLeafIds(child.id))
        : [id]
}

const isWithin = (orgUnit: DemoOrgUnit, ancestorId: string) =>
    orgUnit.path.split('/').includes(ancestorId)

/* Urban chiefdoms on the coast and around the capital; the rest rural */
const URBAN_IDS = ['DemoChN0103', 'DemoChW0103', 'DemoChE0104', 'DemoChS0101']

export const ORG_UNIT_GROUPS: DemoOrgUnitGroup[] = [
    { id: 'DemoGrpUrb1', name: 'Urban', memberIds: URBAN_IDS },
    {
        id: 'DemoGrpRur1',
        name: 'Rural',
        memberIds: ORG_UNITS.filter(
            (orgUnit) => orgUnit.level === 3 && !URBAN_IDS.includes(orgUnit.id)
        ).map(({ id }) => id),
    },
]

const LEVEL_PREFIX = 'LEVEL-'
const GROUP_PREFIX = 'OU_GROUP-'

/* The level a LEVEL- item names, by number or by the level's UID */
const parseLevel = (item: string): number | undefined => {
    const value = item.slice(LEVEL_PREFIX.length)
    const byNumber = Number(value)
    return Number.isInteger(byNumber)
        ? byNumber
        : ORG_UNIT_LEVELS.find(({ id }) => id === value)?.level
}

/* The org units an analytics request's ou items stand for, as DHIS2
 * resolves them: the user's units (the demo user sits at the country), the
 * units at a level or in a group within the units picked with them (or in
 * the whole tree), and the units picked themselves. Unknown ids are
 * dropped. */
export const resolveOrgUnits = (items: string[]): DemoOrgUnit[] => {
    const userUnits: Record<string, DemoOrgUnit[]> = {
        USER_ORGUNIT: [COUNTRY_UNIT],
        USER_ORGUNIT_CHILDREN: getChildren(ROOT_ORG_UNIT_ID),
        USER_ORGUNIT_GRANDCHILDREN: getChildren(ROOT_ORG_UNIT_ID).flatMap(
            ({ id }) => getChildren(id)
        ),
    }
    const picked = items.flatMap((item) => {
        const orgUnit = byId.get(item)
        return userUnits[item] ?? (orgUnit ? [orgUnit] : [])
    })
    const levels = items
        .filter((item) => item.startsWith(LEVEL_PREFIX))
        .map(parseLevel)
    const groups = items
        .filter((item) => item.startsWith(GROUP_PREFIX))
        .map((item) =>
            ORG_UNIT_GROUPS.find(
                ({ id }) => id === item.slice(GROUP_PREFIX.length)
            )
        )
    if (!levels.length && !groups.length) {
        return unique(picked)
    }
    /* A level or a group narrows to units within the ones picked with it,
     * which themselves are not shown */
    const boundaries = picked.length ? picked : [COUNTRY_UNIT]
    const matches = ORG_UNITS.filter(
        (orgUnit) =>
            boundaries.some((boundary) => isWithin(orgUnit, boundary.id)) &&
            (levels.includes(orgUnit.level) ||
                groups.some((group) => group?.memberIds.includes(orgUnit.id)))
    )
    return unique(matches)
}

const unique = (orgUnits: DemoOrgUnit[]): DemoOrgUnit[] => [
    ...new Map(orgUnits.map((orgUnit) => [orgUnit.id, orgUnit])).values(),
]
