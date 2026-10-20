import {
    dataClicked,
    selectorValueChanged,
    viewDrilledUpTo,
    viewDrillReset,
    viewRolesChanged,
} from '@store/interactions-slice'
import { viewRemoved } from '@store/workspace-slice'
import { describe, expect, it } from 'vitest'
import { demoland, north, setUp, west } from './interactions-fixtures'

describe('drilling', () => {
    it('shows the sub-units of a unit drilled into, and sets the channel to it', () => {
        const store = setUp()
        store.drillInto('map-1', north)

        expect(store.drills()).toEqual({
            'map-1': { item: north, depth: 1 },
        })
        expect(store.orgUnits()).toMatchObject({
            value: [north],
            setBy: 'map-1',
        })
    })

    it('shows the level of a unit drilled up to, or the unit alone at the top', () => {
        const store = setUp()

        store.dispatch(viewDrilledUpTo({ viewId: 'map-1', item: north }))
        expect(store.drills()['map-1']).toEqual({
            item: { id: 'DemoLand001', path: '/DemoLand001' },
            depth: 1,
        })
        expect(store.orgUnits().value).toEqual([north])

        store.dispatch(viewDrilledUpTo({ viewId: 'map-1', item: demoland }))
        expect(store.drills()['map-1']).toEqual({ item: demoland, depth: 0 })
        expect(store.orgUnits().value).toEqual([demoland])
    })

    it('goes back to the saved item, and the channel to what it held before', () => {
        const store = setUp()
        store.dispatch(selectorValueChanged({ viewId: 'ou-1', value: [west] }))
        store.drillInto('map-1')

        store.dispatch(viewDrillReset('map-1'))

        expect(store.drills()).toEqual({})
        expect(store.orgUnits()).toMatchObject({ value: [west], setBy: null })
    })

    it('leaves a value others set since, back at the saved item', () => {
        const store = setUp()
        store.drillInto('map-1')
        store.dispatch(selectorValueChanged({ viewId: 'ou-1', value: [west] }))

        store.dispatch(viewDrillReset('map-1'))

        expect(store.orgUnits().value).toEqual([west])
    })

    it('drills a view that doesn’t send alone', () => {
        const store = setUp()
        store.stopSending('vis-1')

        store.drillInto('vis-1')

        expect(store.orgUnits().value).toEqual([])
        expect(Object.keys(store.drills())).toEqual(['vis-1'])
    })

    it('resets the drill of views that follow a new org unit, not of the one setting it', () => {
        const store = setUp()
        store.stopSending('vis-1')
        store.drillInto('vis-1')

        /* The map's drill sets North, which the visualization follows */
        store.drillInto('map-1')
        expect(Object.keys(store.drills())).toEqual(['map-1'])

        store.dispatch(
            dataClicked({
                viewId: 'map-1',
                click: { ou: west },
                additive: false,
            })
        )
        expect(Object.keys(store.drills())).toEqual(['map-1'])
    })

    it('resets every follower’s drill for a selector’s value, and keeps a drill that follows nothing', () => {
        const store = setUp()
        store.stopSending('map-1')
        store.stopSending('vis-1')
        store.drillInto('map-1')
        store.drillInto('vis-1')
        store.dispatch(
            viewRolesChanged({
                viewId: 'vis-1',
                dimension: 'ou',
                roles: { send: true, receive: false },
            })
        )

        store.dispatch(selectorValueChanged({ viewId: 'ou-1', value: [west] }))

        expect(Object.keys(store.drills())).toEqual(['vis-1'])
    })

    it('keeps its own drill when a click of its own brings the value from before back', () => {
        const store = setUp()
        store.dispatch(selectorValueChanged({ viewId: 'ou-1', value: [north] }))
        store.dispatch(viewDrilledUpTo({ viewId: 'map-1', item: north }))
        const clickWest = () =>
            dataClicked({
                viewId: 'map-1',
                click: { ou: west },
                additive: false,
            })

        /* A double-click: selected, then the same point again */
        store.dispatch(clickWest())
        store.dispatch(clickWest())

        /* Nothing selected: the unit it's drilled into, Demoland */
        expect(store.orgUnits()).toMatchObject({
            value: [{ id: 'DemoLand001', path: '/DemoLand001' }],
            setBy: 'map-1',
        })
        expect(store.drills()['map-1']).toEqual({
            item: { id: 'DemoLand001', path: '/DemoLand001' },
            depth: 1,
        })
    })

    it('passes the unit it’s drilled into when its last point is deselected', () => {
        const store = setUp()
        store.drillInto('map-1', north)
        const clickAmberHills = () =>
            dataClicked({
                viewId: 'map-1',
                click: {
                    ou: {
                        id: 'DemoChN0101',
                        path: '/DemoLand001/DemoNorth01/DemoChN0101',
                    },
                },
                additive: false,
            })

        store.dispatch(clickAmberHills())
        store.dispatch(clickAmberHills())

        /* Everyone shows North, as the drilled map does */
        expect(store.orgUnits()).toMatchObject({
            value: [north],
            setBy: 'map-1',
        })
    })

    it('keeps drills when only a period changes, and drops a closed view’s', () => {
        const store = setUp()
        store.drillInto('map-1')

        store.dispatch(
            selectorValueChanged({ viewId: 'pe-1', value: [{ id: '2025' }] })
        )
        expect(Object.keys(store.drills())).toEqual(['map-1'])

        store.dispatch(viewRemoved('map-1'))
        expect(store.drills()).toEqual({})
    })
})
