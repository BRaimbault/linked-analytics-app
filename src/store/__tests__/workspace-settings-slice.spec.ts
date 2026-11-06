import { configureStore } from '@reduxjs/toolkit'
import {
    selectViewHeaders,
    selectViewHeadersHidden,
    selectViewHeadersMode,
    viewHeadersChanged,
    viewHeadersHiddenChanged,
    workspaceSettingsSlice,
} from '@store/workspace-settings-slice'
import { describe, expect, it } from 'vitest'

describe('workspace settings slice', () => {
    it('shows view headers always, until set to show them on hover', () => {
        const store = configureStore({
            reducer: {
                [workspaceSettingsSlice.reducerPath]:
                    workspaceSettingsSlice.reducer,
            },
        })
        expect(selectViewHeaders(store.getState())).toBe('always')

        store.dispatch(viewHeadersChanged('hover'))

        expect(selectViewHeaders(store.getState())).toBe('hover')
    })

    it('hides view headers over the choice above, and keeps the choice for when they show', () => {
        const store = configureStore({
            reducer: {
                [workspaceSettingsSlice.reducerPath]:
                    workspaceSettingsSlice.reducer,
            },
        })
        store.dispatch(viewHeadersChanged('hover'))
        expect(selectViewHeadersMode(store.getState())).toBe('hover')

        store.dispatch(viewHeadersHiddenChanged(true))
        expect(selectViewHeadersHidden(store.getState())).toBe(true)
        expect(selectViewHeadersMode(store.getState())).toBe('hidden')

        store.dispatch(viewHeadersHiddenChanged(false))
        expect(selectViewHeadersMode(store.getState())).toBe('hover')
    })
})
