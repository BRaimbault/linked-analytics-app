import {
    createPluginLoads,
    type PluginLoads,
} from '@modules/plugins/plugin-loads'
import {
    createContext,
    useContext,
    useState,
    type FC,
    type ReactNode,
} from 'react'

const PluginLoadsContext = createContext<PluginLoads>(createPluginLoads())

/* One per workspace: its plugin views report to it, its selectors wait on
 * it */
export const PluginLoadsProvider: FC<{ children: ReactNode }> = ({
    children,
}) => {
    const [loads] = useState(createPluginLoads)
    return (
        <PluginLoadsContext.Provider value={loads}>
            {children}
        </PluginLoadsContext.Provider>
    )
}

export const usePluginLoads = (): PluginLoads => useContext(PluginLoadsContext)
