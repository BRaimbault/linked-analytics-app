import type { Channel } from '@modules/interactions/channels'
import {
    canDrillInto,
    getMenuDrillTargets,
    getParentOf,
    getViewLinks,
    type Drills,
} from '@modules/interactions/drills'
import { describe, expect, it } from 'vitest'

const demoland = { id: 'DemoLand001', name: 'Demoland', path: '/DemoLand001' }
const north = {
    id: 'DemoNorth01',
    name: 'North',
    path: '/DemoLand001/DemoNorth01',
}
const amberHills = {
    id: 'DemoChN0101',
    name: 'Amber Hills',
    path: '/DemoLand001/DemoNorth01/DemoChN0101',
}
const LEVELS = 3

const both = { send: true, receive: true }
const channel = (overrides: Partial<Channel>): Channel => ({
    label: 'A',
    dimension: 'ou',
    value: [],
    setBy: null,
    before: [],
    selectorViewId: null,
    members: { 'map-1': both, 'vis-1': both },
    ...overrides,
})

describe('drills', () => {
    it('find a unit’s parent from its path', () => {
        expect(getParentOf(amberHills)).toEqual({
            id: 'DemoNorth01',
            path: '/DemoLand001/DemoNorth01',
        })
        expect(getParentOf(demoland)).toBeNull()
        expect(getParentOf({ id: 'no-path' })).toBeNull()
    })

    it('drill into a unit above the deepest level, unless its sub-units show', () => {
        const can = (drills: Drills, item: typeof north) =>
            canDrillInto(drills, 'map-1', { item, orgUnitLevelCount: LEVELS })
        const intoNorth = { 'map-1': { item: north, depth: 1 as const } }
        const northAlone = { 'map-1': { item: north, depth: 0 as const } }

        expect(can(intoNorth, demoland)).toBe(true)
        expect(can(intoNorth, north)).toBe(false)
        expect(can(northAlone, north)).toBe(true)
        expect(can({}, amberHills)).toBe(false)
        expect(can({}, { id: 'no-path', name: 'No path', path: '' })).toBe(
            false
        )
    })

    describe('from the ⋯ menu', () => {
        const targets = (channels: Channel[], drills: Drills = {}) =>
            getMenuDrillTargets({ channels, drills }, 'map-1', LEVELS)

        it('start from the unit the view set by a click, alone', () => {
            expect(
                targets([channel({ value: [north], setBy: 'map-1' })])
            ).toEqual({ down: north, up: getParentOf(north) })
            /* Set by another view, or several units */
            expect(
                targets([channel({ value: [north], setBy: 'vis-1' })])
            ).toEqual({ down: null, up: null })
            expect(
                targets([channel({ value: [north, demoland], setBy: 'map-1' })])
            ).toEqual({ down: null, up: null })
            expect(targets([])).toEqual({ down: null, up: null })
        })

        it('go up to the level of the unit the view is drilled into', () => {
            const drilled = [channel({ value: [north], setBy: 'map-1' })]

            expect(
                targets(drilled, { 'map-1': { item: north, depth: 1 } })
            ).toEqual({ down: null, up: north })
            /* Shown alone at the top: nothing above */
            expect(
                targets([], { 'map-1': { item: demoland, depth: 0 } })
            ).toEqual({ down: null, up: null })
        })
    })

    describe('what a view is rewritten with', () => {
        const channels = [
            channel({
                value: [north],
                setBy: 'map-1',
                members: { 'map-1': { ...both, depth: 2 }, 'vis-1': both },
            }),
            channel({
                label: 'B',
                dimension: 'pe',
                value: [{ id: '2025' }],
                setBy: 'map-1',
            }),
        ]

        it('is what its channels bring, while it isn’t drilled', () => {
            expect(getViewLinks({ channels, drills: {} }, 'vis-1')).toEqual({
                incoming: { ou: [north], pe: [{ id: '2025' }] },
                orgUnitDepth: 1,
                highlight: undefined,
            })
            expect(getViewLinks({ channels, drills: {} }, 'map-1')).toEqual({
                incoming: {},
                orgUnitDepth: 2,
                highlight: { ou: ['DemoNorth01'], pe: ['2025'] },
            })
        })

        it('is its focus, without highlighting a unit whose sub-units it shows', () => {
            expect(
                getViewLinks(
                    {
                        channels,
                        drills: { 'map-1': { item: north, depth: 1 } },
                    },
                    'map-1'
                )
            ).toEqual({
                incoming: { ou: [north] },
                orgUnitDepth: 1,
                highlight: { pe: ['2025'] },
            })
            /* A unit shown alone is drawn, so it keeps its highlight */
            expect(
                getViewLinks(
                    {
                        channels,
                        drills: { 'map-1': { item: north, depth: 0 } },
                    },
                    'map-1'
                ).highlight
            ).toEqual({ ou: ['DemoNorth01'], pe: ['2025'] })
        })

        it('keeps another highlighted unit, and drops a highlight left empty', () => {
            const byMap = (value: (typeof north)[]) => [
                channel({ value, setBy: 'map-1' }),
            ]
            const intoNorth = { 'map-1': { item: north, depth: 1 as const } }

            expect(
                getViewLinks(
                    { channels: byMap([north, amberHills]), drills: intoNorth },
                    'map-1'
                ).highlight
            ).toEqual({ ou: ['DemoChN0101'] })
            expect(
                getViewLinks(
                    { channels: byMap([north]), drills: intoNorth },
                    'map-1'
                ).highlight
            ).toBeUndefined()
            expect(
                getViewLinks({ channels: [], drills: intoNorth }, 'map-1')
                    .highlight
            ).toBeUndefined()
        })
    })
})
