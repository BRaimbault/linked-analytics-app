import { api } from '@api/api'
import { isDebugMode } from '@modules/debug-mode'
import { configureStore } from '@reduxjs/toolkit'
import type { DataEngine } from '@types'
import { workspaceSlice } from './workspace-slice'

export const createStore = (engine: DataEngine) =>
    configureStore({
        reducer: {
            [api.reducerPath]: api.reducer,
            [workspaceSlice.reducerPath]: workspaceSlice.reducer,
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({
                thunk: {
                    extraArgument: { engine },
                },
            }).concat(api.middleware),
        devTools: isDebugMode(),
    })

export type AppStore = ReturnType<typeof createStore>
export type AppDispatch = AppStore['dispatch']
export type RootState = ReturnType<AppStore['getState']>
