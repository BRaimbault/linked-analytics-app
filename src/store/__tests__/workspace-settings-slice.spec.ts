import { configureStore } from '@reduxjs/toolkit'
import {
    selectViewHeaders,
    viewHeadersChanged,
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
})
