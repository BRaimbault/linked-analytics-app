import {
    getClickedItems,
    getHighlight,
    getIncomingLinks,
    getNextChannelLabel,
    toggleValue,
    type Channel,
} from '@modules/interactions/channels'
import { describe, expect, it } from 'vitest'

const channel = (overrides: Partial<Channel>): Channel => ({
    label: 'A',
    dimension: 'ou',
    value: [],
    setBy: null,
    selectorViewId: null,
    members: {},
    ...overrides,
})

const north = { id: 'DemoNorth01', name: 'North' }
const west = { id: 'DemoWest001', name: 'West' }
const january = { id: '202601' }

describe('channels', () => {
    it('names a new channel with the first free letter', () => {
        expect(getNextChannelLabel([])).toBe('A')
        expect(
            getNextChannelLabel([
                channel({ label: 'A' }),
                channel({ label: 'C' }),
            ])
        ).toBe('B')
    })

    describe('incoming links', () => {
        const channels = [
            channel({
                value: [north],
                setBy: 'map-1',
                members: {
                    'map-1': { send: true, receive: true },
                    'vis-1': { send: true, receive: true },
                    'vis-2': { send: true, receive: false },
                },
            }),
            channel({
                label: 'B',
                dimension: 'pe',
                value: [january],
                members: { 'map-1': { send: true, receive: true } },
            }),
            channel({
                label: 'C',
                dimension: 'pe',
                members: { 'vis-1': { send: true, receive: true } },
            }),
        ]

        it('holds the values of the channels a view receives', () => {
            expect(getIncomingLinks(channels, 'vis-1')).toEqual({ ou: [north] })
        })

        it('leaves out values the view set itself, and channels it only sends to', () => {
            expect(getIncomingLinks(channels, 'map-1')).toEqual({
                pe: [january],
            })
            expect(getIncomingLinks(channels, 'vis-2')).toEqual({})
        })
    })

    it('highlights what a view set with its own clicks', () => {
        const channels = [
            channel({ value: [north, west], setBy: 'map-1' }),
            channel({ label: 'B', dimension: 'pe', value: [january] }),
        ]

        expect(getHighlight(channels, 'map-1')).toEqual({
            ou: ['DemoNorth01', 'DemoWest001'],
        })
        expect(getHighlight(channels, 'vis-1')).toBeUndefined()
    })

    it('takes the org unit and period of a click, not its data', () => {
        expect(
            getClickedItems({
                ou: { id: 'DemoNorth01', path: '/x', level: 'DemoLevel02' },
                dx: { id: 'DemoMalar01' },
            })
        ).toEqual({ ou: { id: 'DemoNorth01', path: '/x' } })
        expect(getClickedItems({ pe: { id: '202601', name: 'Jan' } })).toEqual({
            pe: { id: '202601', name: 'Jan' },
        })
    })

    it('replaces, clears or adds to a value on a click', () => {
        expect(toggleValue([], north, false)).toEqual([north])
        expect(toggleValue([west], north, false)).toEqual([north])
        expect(toggleValue([north], north, false)).toEqual([])
        expect(toggleValue([north, west], north, false)).toEqual([north])
        expect(toggleValue([west], north, true)).toEqual([west, north])
        expect(toggleValue([west, north], north, true)).toEqual([west])
    })
})
