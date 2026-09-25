import {
    getViewKind,
    type ViewKind,
    type ViewType,
} from '@modules/workspace/view-types'
import {
    createSelector,
    createSlice,
    type PayloadAction,
} from '@reduxjs/toolkit'

export type WorkspaceView = {
    id: string
    type: ViewType
    kind: ViewKind
    number: number
}

type WorkspaceState = {
    views: WorkspaceView[]
    activeViewId: string | null
}

const initialState: WorkspaceState = {
    views: [],
    activeViewId: null,
}

/* Mirrors the dockview layout, which stays the source of truth; only
 * dockview event handlers dispatch these actions. */
export const workspaceSlice = createSlice({
    name: 'workspace',
    initialState,
    reducers: {
        viewAdded: {
            reducer(state, action: PayloadAction<WorkspaceView>) {
                if (
                    !state.views.some((view) => view.id === action.payload.id)
                ) {
                    state.views.push(action.payload)
                }
            },
            prepare: (view: Omit<WorkspaceView, 'kind'>) => ({
                payload: { ...view, kind: getViewKind(view.type) },
            }),
        },
        viewRemoved(state, action: PayloadAction<string>) {
            state.views = state.views.filter(
                (view) => view.id !== action.payload
            )
            if (state.activeViewId === action.payload) {
                state.activeViewId = null
            }
        },
        activeViewChanged(state, action: PayloadAction<string | null>) {
            state.activeViewId = action.payload
        },
    },
    selectors: {
        selectViews: (state) => state.views,
        selectActiveView: (state) =>
            state.views.find((view) => view.id === state.activeViewId) ?? null,
    },
})

export const { viewAdded, viewRemoved, activeViewChanged } =
    workspaceSlice.actions
export const { selectViews, selectActiveView } = workspaceSlice.selectors

export const selectPluginViews = createSelector([selectViews], (views) =>
    views.filter((view) => view.kind === 'plugin')
)
