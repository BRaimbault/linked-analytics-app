/* The demo's org unit tree: a made-up country, 4 districts and 14
 * chiefdoms, with levels and groups as DHIS2 has them. Names are made up
 * on purpose, so the demo's numbers can't pass for real health data. Ids
 * look like DHIS2 UIDs (11 characters), so objects built on them look real
 * to the pickers. */

export type Point = [number, number]
/* A polygon's outer ring, in the demo's own 0-100 plane (y down) */
export type Ring = Point[]

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
    shape: Ring
}

export type DemoOrgUnitGroup = { id: string; name: string; memberIds: string[] }

export const ORG_UNIT_LEVELS: DemoOrgUnitLevel[] = [
    { id: 'DemoLevel01', level: 1, name: 'National' },
    { id: 'DemoLevel02', level: 2, name: 'District' },
    { id: 'DemoLevel03', level: 3, name: 'Chiefdom' },
]

type Box = { left: number; top: number; width: number; height: number }

const toRing = ({ left, top, width, height }: Box): Ring => [
    [left, top],
    [left + width, top],
    [left + width, top + height],
    [left, top + height],
    [left, top],
]

/* Chiefdoms tile their district: side by side, as every district is wider
 * than it is tall */
const slice = (box: Box, count: number): Box[] =>
    Array.from({ length: count }, (_, index) => ({
        ...box,
        left: box.left + (box.width / count) * index,
        width: box.width / count,
    }))

const COUNTRY = { id: 'DemoLand001', name: 'Demoland' }
const COUNTRY_BOX: Box = { left: 0, top: 0, width: 100, height: 100 }

/* Districts tile the country: a strip across the top and the bottom, and
 * two halves between them */
const DISTRICTS: {
    id: string
    name: string
    box: Box
    chiefdoms: [string, string][]
}[] = [
    {
        id: 'DemoNorth01',
        name: 'North',
        box: { left: 0, top: 0, width: 100, height: 30 },
        chiefdoms: [
            ['DemoChN0101', 'Amber Hills'],
            ['DemoChN0102', 'Birch Valley'],
            ['DemoChN0103', 'Cedar Coast'],
        ],
    },
    {
        id: 'DemoWest001',
        name: 'West',
        box: { left: 0, top: 30, width: 50, height: 40 },
        chiefdoms: [
            ['DemoChW0101', 'Kestrel'],
            ['DemoChW0102', 'Lark Meadow'],
            ['DemoChW0103', 'Maple Point'],
            ['DemoChW0104', 'Nettle Hill'],
        ],
    },
    {
        id: 'DemoEast001',
        name: 'East',
        box: { left: 50, top: 30, width: 50, height: 40 },
        chiefdoms: [
            ['DemoChE0101', 'Dawn Plains'],
            ['DemoChE0102', 'Elm Ridge'],
            ['DemoChE0103', 'Fern Lake'],
            ['DemoChE0104', 'Granite Bay'],
        ],
    },
    {
        id: 'DemoSouth01',
        name: 'South',
        box: { left: 0, top: 70, width: 100, height: 30 },
        chiefdoms: [
            ['DemoChS0101', 'Harbor'],
            ['DemoChS0102', 'Iris Fields'],
            ['DemoChS0103', 'Juniper'],
        ],
    },
]

const unit = ({
    id,
    name,
    parent,
    box,
}: {
    id: string
    name: string
    parent: DemoOrgUnit | null
    box: Box
}): DemoOrgUnit => {
    const level = parent ? parent.level + 1 : 1
    return {
        id,
        name,
        level,
        levelId: ORG_UNIT_LEVELS[level - 1].id,
        path: `${parent?.path ?? ''}/${id}`,
        parentId: parent?.id ?? null,
        shape: toRing(box),
    }
}

const COUNTRY_UNIT = unit({ ...COUNTRY, parent: null, box: COUNTRY_BOX })

export const ORG_UNITS: DemoOrgUnit[] = [
    COUNTRY_UNIT,
    ...DISTRICTS.flatMap((district) => {
        const districtUnit = unit({ ...district, parent: COUNTRY_UNIT })
        const boxes = slice(district.box, district.chiefdoms.length)
        return [
            districtUnit,
            ...district.chiefdoms.map(([id, name], index) =>
                unit({ id, name, parent: districtUnit, box: boxes[index] })
            ),
        ]
    }),
]

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
