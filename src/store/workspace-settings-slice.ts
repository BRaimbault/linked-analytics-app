import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

/* A view's header (title, maximize, ⋯, close) always shows, or only while
 * the pointer is over the view, floating over its top */
export type ViewHeaders = 'always' | 'hover'

/* How headers show on the page: hidden overrides the choice above, which
 * is kept for when they show again */
export type ViewHeadersMode = ViewHeaders | 'hidden'

type WorkspaceSettingsState = {
    viewHeaders: ViewHeaders
    viewHeadersHidden: boolean
}

const initialState: WorkspaceSettingsState = {
    viewHeaders: 'always',
    viewHeadersHidden: false,
}

/* Settings of the whole workspace, set in its Workspace tab */
export const workspaceSettingsSlice = createSlice({
    name: 'workspaceSettings',
    initialState,
    reducers: {
        viewHeadersChanged(state, action: PayloadAction<ViewHeaders>) {
            state.viewHeaders = action.payload
        },
        viewHeadersHiddenChanged(state, action: PayloadAction<boolean>) {
            state.viewHeadersHidden = action.payload
        },
    },
    selectors: {
        selectViewHeaders: (state) => state.viewHeaders,
        selectViewHeadersHidden: (state) => state.viewHeadersHidden,
        selectViewHeadersMode: (state): ViewHeadersMode =>
            state.viewHeadersHidden ? 'hidden' : state.viewHeaders,
    },
})

export const { viewHeadersChanged, viewHeadersHiddenChanged } =
    workspaceSettingsSlice.actions
export const {
    selectViewHeaders,
    selectViewHeadersHidden,
    selectViewHeadersMode,
} = workspaceSettingsSlice.selectors
