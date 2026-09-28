import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

/* A view's header (title, maximize, ⋯, close) always shows, or only while
 * the pointer is over the view, floating over its top */
export type ViewHeaders = 'always' | 'hover'

type WorkspaceSettingsState = {
    viewHeaders: ViewHeaders
}

const initialState: WorkspaceSettingsState = {
    viewHeaders: 'always',
}

/* Settings of the whole workspace, set in its Workspace tab */
export const workspaceSettingsSlice = createSlice({
    name: 'workspaceSettings',
    initialState,
    reducers: {
        viewHeadersChanged(state, action: PayloadAction<ViewHeaders>) {
            state.viewHeaders = action.payload
        },
    },
    selectors: {
        selectViewHeaders: (state) => state.viewHeaders,
    },
})

export const { viewHeadersChanged } = workspaceSettingsSlice.actions
export const { selectViewHeaders } = workspaceSettingsSlice.selectors
