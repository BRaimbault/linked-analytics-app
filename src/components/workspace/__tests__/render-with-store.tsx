import { WorkspaceApiContext } from '@components/workspace/workspace-api-context'
import { createStore } from '@store/store'
import { render } from '@testing-library/react'
import type { DataEngine } from '@types'
import type { DockviewApi } from 'dockview-react'
import type { ReactElement } from 'react'
import { Provider } from 'react-redux'

export const renderWithStore = (
    ui: ReactElement,
    { api = null }: { api?: DockviewApi | null } = {}
) => {
    const store = createStore({} as DataEngine)
    const result = render(
        <Provider store={store}>
            <WorkspaceApiContext.Provider value={api}>
                {ui}
            </WorkspaceApiContext.Provider>
        </Provider>
    )
    return { ...result, store }
}
