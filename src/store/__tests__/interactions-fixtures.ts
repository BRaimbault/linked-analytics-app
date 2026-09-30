import { configureStore } from '@reduxjs/toolkit'
import {
    interactionsSlice,
    selectChannels,
    selectDrills,
    viewDrilledDown,
    viewRolesChanged,
} from '@store/interactions-slice'
import { viewAdded } from '@store/workspace-slice'

export const demoland = {
    id: 'DemoLand001',
    name: 'Demoland',
    path: '/DemoLand001',
}
export const north = {
    id: 'DemoNorth01',
    name: 'North',
    path: '/DemoLand001/DemoNorth01',
}
export const west = {
    id: 'DemoWest001',
    name: 'West',
    path: '/DemoLand001/DemoWest001',
}

/* A map and a visualization in org unit channel A, with its selector, and
 * in period channel B */
export const setUp = () => {
    const store = configureStore({
        reducer: {
            [interactionsSlice.reducerPath]: interactionsSlice.reducer,
        },
    })
    store.dispatch(viewAdded({ id: 'map-1', type: 'map', number: 1 }))
    store.dispatch(viewAdded({ id: 'vis-1', type: 'visualization', number: 1 }))
    store.dispatch(
        viewAdded({ id: 'ou-1', type: 'org-unit-selector', number: 1 })
    )
    store.dispatch(
        viewAdded({ id: 'pe-1', type: 'period-selector', number: 1 })
    )
    return {
        ...store,
        drills: () => selectDrills(store.getState()),
        orgUnits: () => selectChannels(store.getState())[0],
        /* Each channel's value, as ids */
        values: () =>
            selectChannels(store.getState()).map(({ value }) =>
                value.map(({ id }) => id)
            ),
        drillInto: (viewId: string, item = north) =>
            store.dispatch(viewDrilledDown({ viewId, item })),
        stopSending: (viewId: string) =>
            store.dispatch(
                viewRolesChanged({
                    viewId,
                    dimension: 'ou',
                    roles: { send: false, receive: true },
                })
            ),
    }
}
