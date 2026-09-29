import { configureStore } from '@reduxjs/toolkit'
import {
    dataClicked,
    interactionsSlice,
    selectChannels,
    selectorChannelChanged,
    viewChannelChanged,
    viewRolesChanged,
} from '@store/interactions-slice'
import { viewAdded, viewRemoved } from '@store/workspace-slice'
import { describe, expect, it } from 'vitest'

/* The choices of a view's Links section (docs/interactions.md §5.4) */

const createTestStore = () => {
    const store = configureStore({
        reducer: {
            [interactionsSlice.reducerPath]: interactionsSlice.reducer,
        },
    })
    return {
        ...store,
        channels: () => selectChannels(store.getState()),
        /* Each channel's letter and member ids, e.g. { A: ['map-1'] } */
        memberships: () =>
            Object.fromEntries(
                selectChannels(store.getState()).map(({ label, members }) => [
                    label,
                    Object.keys(members),
                ])
            ),
    }
}

const both = { send: true, receive: true }
const north = { id: 'DemoNorth01', name: 'North' }

/* Two maps and two org unit selectors: A and B; both maps are in A */
const setUpTwoChannels = () => {
    const store = createTestStore()
    store.dispatch(viewAdded({ id: 'map-1', type: 'map', number: 1 }))
    store.dispatch(viewAdded({ id: 'map-2', type: 'map', number: 2 }))
    store.dispatch(
        viewAdded({ id: 'ou-1', type: 'org-unit-selector', number: 1 })
    )
    store.dispatch(
        viewAdded({ id: 'ou-2', type: 'org-unit-selector', number: 2 })
    )
    return store
}

const move = (viewId: string, choice: { label: string } | 'new' | 'none') =>
    viewChannelChanged({ viewId, dimension: 'ou', choice })

describe('a view’s channel', () => {
    it('moves to another channel of the dimension, keeping its roles', () => {
        const store = setUpTwoChannels()
        store.dispatch(
            viewRolesChanged({
                viewId: 'map-2',
                dimension: 'ou',
                roles: { send: false, receive: true },
            })
        )

        store.dispatch(move('map-2', { label: 'B' }))

        expect(store.memberships()).toEqual({ A: ['map-1'], B: ['map-2'] })
        expect(store.channels()[1].members['map-2']).toEqual({
            send: false,
            receive: true,
        })
    })

    it('moves to a new channel of its own, whose value it then sets', () => {
        const store = setUpTwoChannels()

        store.dispatch(move('map-2', 'new'))
        store.dispatch(
            dataClicked({
                viewId: 'map-2',
                click: { ou: north },
                additive: false,
            })
        )

        expect(store.memberships()).toEqual({
            A: ['map-1'],
            B: [],
            C: ['map-2'],
        })
        expect(store.channels()[2]).toMatchObject({
            value: [north],
            setBy: 'map-2',
            selectorViewId: null,
        })
    })

    it('leaves with none, and the defaults then leave it out', () => {
        const store = setUpTwoChannels()

        store.dispatch(move('map-2', 'none'))
        store.dispatch(
            viewAdded({ id: 'ou-3', type: 'org-unit-selector', number: 3 })
        )
        store.dispatch(
            dataClicked({
                viewId: 'map-2',
                click: { ou: north },
                additive: false,
            })
        )

        expect(store.memberships()).toEqual({ A: ['map-1'], B: [], C: [] })
        expect(store.channels()[0].value).toEqual([])

        store.dispatch(move('map-2', { label: 'C' }))
        store.dispatch(viewRemoved('ou-3'))
        store.dispatch(move('map-2', 'none'))
        store.dispatch(move('map-2', { label: 'A' }))
        expect(store.memberships()).toEqual({
            A: ['map-1', 'map-2'],
            B: [],
        })
    })

    it('deletes the channel it leaves when that has no selector and no views', () => {
        const store = createTestStore()
        store.dispatch(viewAdded({ id: 'map-1', type: 'map', number: 1 }))
        store.dispatch(
            dataClicked({
                viewId: 'map-1',
                click: { ou: north },
                additive: false,
            })
        )

        store.dispatch(move('map-1', 'new'))

        expect(store.memberships()).toEqual({ B: ['map-1'] })
    })

    it('stops being the source of the value it set, which stays', () => {
        const store = setUpTwoChannels()
        store.dispatch(
            dataClicked({
                viewId: 'map-1',
                click: { ou: north },
                additive: false,
            })
        )

        store.dispatch(move('map-1', { label: 'B' }))

        expect(store.channels()[0]).toMatchObject({
            value: [north],
            setBy: null,
        })
    })

    it('ignores choices that change nothing or can’t be made', () => {
        const store = setUpTwoChannels()
        const before = store.channels()

        store.dispatch(move('map-1', { label: 'A' }))
        store.dispatch(move('map-1', { label: 'Z' }))
        store.dispatch(move('gone', { label: 'B' }))
        store.dispatch(move('map-1', 'none'))
        store.dispatch(move('map-1', 'none'))

        expect(store.memberships()).toEqual({ A: ['map-2'], B: [] })
        expect(before[0].members).toEqual({ 'map-1': both, 'map-2': both })
    })
})

describe('a view’s roles', () => {
    it('stop it setting the value, and clear what it set', () => {
        const store = setUpTwoChannels()
        store.dispatch(
            dataClicked({
                viewId: 'map-1',
                click: { ou: north },
                additive: false,
            })
        )

        store.dispatch(
            viewRolesChanged({
                viewId: 'map-1',
                dimension: 'ou',
                roles: { send: false, receive: true },
            })
        )
        store.dispatch(
            viewRolesChanged({
                viewId: 'map-2',
                dimension: 'ou',
                roles: { send: false, receive: true },
            })
        )

        expect(store.channels()[0]).toMatchObject({
            value: [north],
            setBy: null,
            members: {
                'map-1': { send: false, receive: true },
                'map-2': { send: false, receive: true },
            },
        })
    })

    it('take it out when it neither sends nor follows', () => {
        const store = setUpTwoChannels()

        store.dispatch(
            viewRolesChanged({
                viewId: 'map-1',
                dimension: 'ou',
                roles: { send: false, receive: false },
            })
        )
        store.dispatch(
            viewRolesChanged({
                viewId: 'map-1',
                dimension: 'ou',
                roles: both,
            })
        )

        expect(store.memberships()).toEqual({ A: ['map-2'], B: [] })
    })
})

describe('a selector’s channel', () => {
    it('moves to a channel without a selector, and the one it leaves stays while views use it', () => {
        const store = setUpTwoChannels()
        store.dispatch(move('map-1', 'new'))

        store.dispatch(
            selectorChannelChanged({ viewId: 'ou-1', choice: { label: 'C' } })
        )

        expect(
            store
                .channels()
                .map(({ label, selectorViewId }) => [label, selectorViewId])
        ).toEqual([
            ['A', null],
            ['B', 'ou-2'],
            ['C', 'ou-1'],
        ])
    })

    it('moves to a new channel, and the one it leaves goes when empty', () => {
        const store = createTestStore()
        store.dispatch(
            viewAdded({ id: 'ou-1', type: 'org-unit-selector', number: 1 })
        )

        store.dispatch(
            selectorChannelChanged({ viewId: 'ou-1', choice: 'new' })
        )

        expect(store.channels()).toMatchObject([
            { label: 'B', selectorViewId: 'ou-1', members: {} },
        ])
    })

    it('can’t take a channel that has a selector, or move when it drives none', () => {
        const store = setUpTwoChannels()

        store.dispatch(
            selectorChannelChanged({ viewId: 'ou-1', choice: { label: 'B' } })
        )
        store.dispatch(
            selectorChannelChanged({ viewId: 'ou-1', choice: { label: 'Z' } })
        )
        store.dispatch(
            selectorChannelChanged({ viewId: 'gone', choice: 'new' })
        )

        expect(
            store.channels().map(({ selectorViewId }) => selectorViewId)
        ).toEqual(['ou-1', 'ou-2'])
    })
})
