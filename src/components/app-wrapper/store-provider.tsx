// eslint-disable-next-line no-restricted-imports
import { useDataEngine } from '@dhis2/app-runtime'
import { createStore } from '@store/store'
import { useState } from 'react'
import type { FC, ReactNode } from 'react'
import { Provider } from 'react-redux'

export const StoreProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const engine = useDataEngine()
    const [store] = useState(() => createStore(engine))
    return <Provider store={store}>{children}</Provider>
}
