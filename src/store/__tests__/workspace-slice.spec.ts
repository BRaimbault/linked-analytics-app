import { configureStore } from '@reduxjs/toolkit'
import { describe, expect, it } from 'vitest'
import {
    activeViewChanged,
    selectActiveView,
    selectPluginViews,
    selectViews,
    viewAdded,
    viewRemoved,
    workspaceSlice,
} from '../workspace-slice'

const createTestStore = () =>
    configureStore({
        reducer: { [workspaceSlice.reducerPath]: workspaceSlice.reducer },
    })

const map1 = { id: 'map-a', type: 'map' as const, number: 1 }
const vis1 = { id: 'vis-a', type: 'visualization' as const, number: 1 }
const orgUnit1 = { id: 'ou-a', type: 'org-unit-selector' as const, number: 1 }

/* The store adds each view's kind */
const plugin = <T extends object>(view: T) => ({ ...view, kind: 'plugin' })

describe('workspace slice', () => {
    it('tracks added views once each', () => {
        const store = createTestStore()
        store.dispatch(viewAdded(map1))
        store.dispatch(viewAdded(vis1))
        store.dispatch(viewAdded(map1))

        expect(selectViews(store.getState())).toEqual([
            plugin(map1),
            plugin(vis1),
        ])
    })

    it('exposes the active view', () => {
        const store = createTestStore()
        store.dispatch(viewAdded(map1))
        expect(selectActiveView(store.getState())).toBeNull()

        store.dispatch(activeViewChanged('map-a'))
        expect(selectActiveView(store.getState())).toEqual(plugin(map1))
    })

    it('clears the active view when it is removed', () => {
        const store = createTestStore()
        store.dispatch(viewAdded(map1))
        store.dispatch(viewAdded(vis1))
        store.dispatch(activeViewChanged('map-a'))

        store.dispatch(viewRemoved('vis-a'))
        expect(selectActiveView(store.getState())).toEqual(plugin(map1))

        store.dispatch(viewRemoved('map-a'))
        expect(selectViews(store.getState())).toEqual([])
        expect(selectActiveView(store.getState())).toBeNull()
    })

    it('tells plugin views apart from selectors', () => {
        const store = createTestStore()
        store.dispatch(viewAdded(map1))
        store.dispatch(viewAdded(orgUnit1))

        expect(selectViews(store.getState())[1].kind).toBe('selector')
        expect(selectPluginViews(store.getState())).toEqual([plugin(map1)])
    })
})
