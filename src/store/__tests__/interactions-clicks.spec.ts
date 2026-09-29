import { getIncomingLinks } from '@modules/interactions/channels'
import {
    dataClicked,
    selectChannels,
    selectorValueChanged,
} from '@store/interactions-slice'
import { describe, expect, it } from 'vitest'
import { north, setUp, west } from './interactions-fixtures'

const east = { ...west, id: 'DemoEast001', name: 'East' }

const cell = (
    ou: typeof north,
    pe: string,
    { dx = 'DemoPenta31', additive = false } = {}
) =>
    dataClicked({
        viewId: 'vis-1',
        click: { ou, pe: { id: pe }, dx: { id: dx } },
        additive,
    })

const ctrlCell = (ou: typeof north, pe: string) =>
    cell(ou, pe, { additive: true })

describe('a click on a point with two dimensions', () => {
    it('sets both to another point in the same row or column', () => {
        const store = setUp()
        store.dispatch(cell(north, '2025Q3'))

        store.dispatch(cell(north, '2025Q4'))
        expect(store.values()).toEqual([['DemoNorth01'], ['2025Q4']])

        store.dispatch(cell(west, '2025Q4'))
        expect(store.values()).toEqual([['DemoWest001'], ['2025Q4']])
    })

    it('treats another series at the same place as another point', () => {
        const store = setUp()
        store.dispatch(cell(north, '202601', { dx: 'DemoAnc1st1' }))

        store.dispatch(cell(north, '202601', { dx: 'DemoAnc4th1' }))

        expect(store.values()).toEqual([['DemoNorth01'], ['202601']])
    })

    it('clears both when the same point is clicked again, unless its values changed since', () => {
        const store = setUp()
        store.dispatch(cell(north, '2025Q3'))
        store.dispatch(cell(north, '2025Q3'))
        expect(store.values()).toEqual([[], []])

        store.dispatch(cell(north, '2025Q3'))
        store.dispatch(selectorValueChanged({ viewId: 'ou-1', value: [west] }))
        store.dispatch(cell(north, '2025Q3'))
        expect(store.values()).toEqual([['DemoNorth01'], ['2025Q3']])
    })

    describe('with Ctrl or Cmd', () => {
        it('adds cells of one column: several units, one period', () => {
            const store = setUp()
            store.dispatch(cell(north, '2025Q3'))
            store.dispatch(ctrlCell(west, '2025Q3'))
            expect(store.values()).toEqual([
                ['DemoNorth01', 'DemoWest001'],
                ['2025Q3'],
            ])

            store.dispatch(ctrlCell(east, '2025Q3'))
            expect(store.values()).toEqual([
                ['DemoNorth01', 'DemoWest001', 'DemoEast001'],
                ['2025Q3'],
            ])
        })

        it('adds cells of one row: one unit, several periods', () => {
            const store = setUp()
            store.dispatch(cell(north, '2025Q3'))
            store.dispatch(ctrlCell(north, '2025Q4'))

            expect(store.values()).toEqual([
                ['DemoNorth01'],
                ['2025Q3', '2025Q4'],
            ])
        })

        it('takes a cell out, keeping the items other cells still hold', () => {
            const store = setUp()
            store.dispatch(ctrlCell(north, '2025Q3'))
            store.dispatch(ctrlCell(west, '2025Q4'))
            /* Two cells across: both units, both periods */
            expect(store.values()).toEqual([
                ['DemoNorth01', 'DemoWest001'],
                ['2025Q3', '2025Q4'],
            ])

            store.dispatch(ctrlCell(west, '2025Q4'))
            expect(store.values()).toEqual([['DemoNorth01'], ['2025Q3']])

            /* The last one: back to what the channels held before */
            store.dispatch(ctrlCell(north, '2025Q3'))
            expect(store.values()).toEqual([[], []])
        })

        it('starts a new selection once others changed the values', () => {
            const store = setUp()
            store.dispatch(cell(north, '2025Q3'))
            store.dispatch(
                selectorValueChanged({ viewId: 'ou-1', value: [east] })
            )

            store.dispatch(ctrlCell(west, '2025Q3'))

            expect(store.values()).toEqual([['DemoWest001'], ['2025Q3']])
        })
    })
})

describe('a view that sets a value', () => {
    const incomingOrgUnits = (
        store: ReturnType<typeof setUp>,
        viewId: string
    ) =>
        getIncomingLinks(selectChannels(store.getState()), viewId).ou?.map(
            ({ id }) => id
        )
    const click = (ou: typeof north, viewId = 'vis-1') =>
        dataClicked({ viewId, click: { ou }, additive: false })

    it('keeps showing what it followed before, while the others follow it', () => {
        const store = setUp()
        store.dispatch(selectorValueChanged({ viewId: 'ou-1', value: [north] }))

        store.dispatch(click(west))
        store.dispatch(click(east))

        expect(incomingOrgUnits(store, 'vis-1')).toEqual(['DemoNorth01'])
        expect(incomingOrgUnits(store, 'map-1')).toEqual(['DemoEast001'])
    })

    it('brings that back when the same point is clicked again', () => {
        const store = setUp()
        store.dispatch(selectorValueChanged({ viewId: 'ou-1', value: [north] }))
        store.dispatch(click(west))

        store.dispatch(click(west))

        expect(store.orgUnits()).toMatchObject({
            value: [north],
            setBy: null,
            before: [],
        })
    })

    it('follows a value set since by others, and leaves its own behind when it stops sending', () => {
        const store = setUp()
        store.dispatch(selectorValueChanged({ viewId: 'ou-1', value: [north] }))
        store.dispatch(click(west, 'map-1'))
        store.stopSending('map-1')

        expect(store.orgUnits()).toMatchObject({
            value: [west],
            setBy: null,
            before: [],
        })
        expect(incomingOrgUnits(store, 'map-1')).toEqual(['DemoWest001'])
    })
})
