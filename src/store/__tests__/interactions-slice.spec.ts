import { configureStore } from '@reduxjs/toolkit'
import {
    dataClicked,
    interactionsSlice,
    selectChannels,
    selectorValueChanged,
    viewRolesChanged,
} from '@store/interactions-slice'
import { viewAdded, viewRemoved } from '@store/workspace-slice'
import { describe, expect, it } from 'vitest'

const createTestStore = () => {
    const store = configureStore({
        reducer: {
            [interactionsSlice.reducerPath]: interactionsSlice.reducer,
        },
    })
    return {
        ...store,
        channels: () => selectChannels(store.getState()),
    }
}

const map1 = { id: 'map-1', type: 'map' as const, number: 1 }
const vis1 = { id: 'vis-1', type: 'visualization' as const, number: 1 }
const vis2 = { id: 'vis-2', type: 'visualization' as const, number: 2 }
const orgUnit1 = { id: 'ou-1', type: 'org-unit-selector' as const, number: 1 }
const orgUnit2 = { id: 'ou-2', type: 'org-unit-selector' as const, number: 2 }
const period1 = { id: 'pe-1', type: 'period-selector' as const, number: 1 }
const data1 = { id: 'dx-1', type: 'data-selector' as const, number: 1 }
const text1 = { id: 'text-1', type: 'text' as const, number: 1 }

const both = { send: true, receive: true }
const north = {
    id: 'DemoNorth01',
    name: 'North',
    path: '/DemoLand001/DemoNorth01',
}
const clickNorth = (viewId: string, additive = false) =>
    dataClicked({ viewId, click: { ou: north }, additive })

describe('links slice', () => {
    it('starts with no channels', () => {
        expect(createTestStore().channels()).toEqual([])
    })

    it('creates a channel for a selector, which every view joins both ways', () => {
        const store = createTestStore()
        store.dispatch(viewAdded(map1))
        store.dispatch(viewAdded(vis1))
        store.dispatch(viewAdded(orgUnit1))
        store.dispatch(viewAdded(orgUnit1))

        expect(store.channels()).toEqual([
            {
                label: 'A',
                dimension: 'ou',
                value: [],
                setBy: null,
                before: [],
                selectorViewId: 'ou-1',
                members: { 'map-1': both, 'vis-1': both },
            },
        ])
    })

    it('adds new views to the first channel of each dimension, once', () => {
        const store = createTestStore()
        store.dispatch(viewAdded(orgUnit1))
        store.dispatch(viewAdded(orgUnit2))
        store.dispatch(viewAdded(period1))
        store.dispatch(viewAdded(map1))
        store.dispatch(viewAdded(map1))

        const [a, b, c] = store.channels()
        expect([a.label, b.label, c.label]).toEqual(['A', 'B', 'C'])
        expect(a.members).toEqual({ 'map-1': both })
        expect(b.members).toEqual({})
        /* A map click carries no period: the map only follows it */
        expect(c.members).toEqual({
            'map-1': { send: false, receive: true },
        })
    })

    it('keeps a view in one channel per dimension', () => {
        const store = createTestStore()
        store.dispatch(viewAdded(map1))
        store.dispatch(viewAdded(orgUnit1))
        store.dispatch(viewAdded(orgUnit2))

        expect(store.channels()[1].members).toEqual({})
    })

    it('gives text views no channel', () => {
        const store = createTestStore()
        store.dispatch(viewAdded(text1))

        expect(store.channels()).toEqual([])
    })

    it('creates a data channel for a data selector, which views follow without sending to it', () => {
        const store = createTestStore()
        store.dispatch(viewAdded(map1))
        store.dispatch(viewAdded(vis1))
        store.dispatch(viewAdded(data1))

        expect(store.channels()).toEqual([
            expect.objectContaining({
                dimension: 'dx',
                selectorViewId: 'dx-1',
                members: {
                    'map-1': { send: false, receive: true },
                    'vis-1': { send: false, receive: true },
                },
            }),
        ])
    })

    it('starts no data channel from a click, and sets data only for a view that sends it', () => {
        const malaria = { id: 'DemoMalar01', name: 'Malaria cases confirmed' }
        const clickMalaria = dataClicked({
            viewId: 'map-1',
            click: { ou: north, dx: malaria },
            additive: false,
        })
        const store = createTestStore()
        store.dispatch(viewAdded(map1))
        store.dispatch(viewAdded(vis1))
        store.dispatch(clickMalaria)

        expect(store.channels().map(({ dimension }) => dimension)).toEqual([
            'ou',
        ])

        store.dispatch(viewAdded(data1))
        store.dispatch(clickMalaria)
        expect(store.channels()[1].value).toEqual([])

        store.dispatch(
            viewRolesChanged({
                viewId: 'map-1',
                dimension: 'dx',
                roles: { send: true, receive: true },
            })
        )
        store.dispatch(clickMalaria)
        expect(store.channels()[1]).toEqual(
            expect.objectContaining({ value: [malaria], setBy: 'map-1' })
        )
    })

    describe('clicks', () => {
        it('create a channel on the first click, and set its value', () => {
            const store = createTestStore()
            store.dispatch(viewAdded(map1))
            store.dispatch(viewAdded(vis1))
            store.dispatch(clickNorth('map-1'))

            expect(store.channels()).toEqual([
                {
                    label: 'A',
                    dimension: 'ou',
                    value: [north],
                    setBy: 'map-1',
                    before: [],
                    selectorViewId: null,
                    members: { 'map-1': both, 'vis-1': both },
                },
            ])
        })

        it('set a value per dimension the click carries', () => {
            const store = createTestStore()
            store.dispatch(viewAdded(vis1))
            store.dispatch(
                dataClicked({
                    viewId: 'vis-1',
                    click: {
                        ou: { ...north, level: 'DemoLevel02' },
                        pe: { id: '202601', name: 'January 2026' },
                        dx: { id: 'DemoMalar01' },
                    },
                    additive: false,
                })
            )

            expect(
                store
                    .channels()
                    .map(({ dimension, value }) => [dimension, value])
            ).toEqual([
                ['ou', [north]],
                ['pe', [{ id: '202601', name: 'January 2026' }]],
            ])
        })

        it('clear the value when the selection is clicked again', () => {
            const store = createTestStore()
            store.dispatch(viewAdded(map1))
            store.dispatch(clickNorth('map-1'))
            store.dispatch(clickNorth('map-1'))

            expect(store.channels()[0]).toMatchObject({
                value: [],
                setBy: null,
            })
        })

        it('add or take out items with Ctrl or Cmd', () => {
            const store = createTestStore()
            const west = { id: 'DemoWest001', name: 'West' }
            store.dispatch(viewAdded(map1))
            store.dispatch(clickNorth('map-1'))
            store.dispatch(
                dataClicked({
                    viewId: 'map-1',
                    click: { ou: west },
                    additive: true,
                })
            )
            expect(store.channels()[0].value).toEqual([north, west])

            store.dispatch(clickNorth('map-1', true))
            expect(store.channels()[0].value).toEqual([west])
        })

        it('do nothing from a view that is closed or doesn’t send', () => {
            const store = createTestStore()
            store.dispatch(clickNorth('map-1'))
            expect(store.channels()).toEqual([])

            store.dispatch(viewAdded(map1))
            store.dispatch(viewAdded(orgUnit1))
            store.dispatch(viewAdded(orgUnit2))
            store.dispatch(viewRemoved('ou-1'))
            store.dispatch(viewRemoved('map-1'))
            store.dispatch(viewAdded({ ...map1, id: 'map-2' }))
            /* map-2 joined B, the only ou channel left, and sends */
            store.dispatch(clickNorth('map-2'))
            expect(store.channels()[0].value).toEqual([north])
        })
    })

    it('sets the value from its selector, for every receiver', () => {
        const store = createTestStore()
        store.dispatch(viewAdded(map1))
        store.dispatch(viewAdded(orgUnit1))
        store.dispatch(clickNorth('map-1'))
        store.dispatch(
            selectorValueChanged({
                viewId: 'ou-1',
                value: [{ id: 'DemoWest001' }],
            })
        )
        store.dispatch(selectorValueChanged({ viewId: 'map-1', value: [] }))

        expect(store.channels()[0]).toMatchObject({
            value: [{ id: 'DemoWest001' }],
            setBy: null,
        })
    })

    describe('closing a view', () => {
        it('takes it out of its channels, and keeps the value it set', () => {
            const store = createTestStore()
            store.dispatch(viewAdded(map1))
            store.dispatch(viewAdded(vis1))
            store.dispatch(clickNorth('map-1'))
            store.dispatch(viewRemoved('map-1'))

            expect(store.channels()[0]).toMatchObject({
                value: [north],
                setBy: null,
                members: { 'vis-1': both },
            })
        })

        it('keeps a channel whose selector is closed while views use it', () => {
            const store = createTestStore()
            store.dispatch(viewAdded(vis1))
            store.dispatch(viewAdded(orgUnit1))
            store.dispatch(viewRemoved('ou-1'))

            expect(store.channels()[0]).toMatchObject({ selectorViewId: null })
        })

        it('deletes a channel with no selector and no members left', () => {
            const store = createTestStore()
            store.dispatch(viewAdded(vis1))
            store.dispatch(viewAdded(vis2))
            store.dispatch(viewAdded(orgUnit1))
            store.dispatch(viewAdded(period1))
            store.dispatch(viewRemoved('vis-1'))
            store.dispatch(viewRemoved('ou-1'))
            expect(store.channels()).toHaveLength(2)

            store.dispatch(viewRemoved('vis-2'))
            expect(store.channels().map(({ label }) => label)).toEqual(['B'])
        })
    })
})
