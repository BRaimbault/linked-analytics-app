import { useDockviewValue } from '@components/workspace/use-dockview-value'
import type { DockviewPanelApi } from 'dockview-react'
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type FC,
    type ReactNode,
} from 'react'
import classes from './styles/panels.module.css'

/* Moving the tools strip moves its panels to another group */
const useIsGroupCollapsed = (api: DockviewPanelApi): boolean => {
    const [group, setGroup] = useState(() => api.group)

    useEffect(() => {
        const subscription = api.onDidGroupChange(() => setGroup(api.group))
        return () => subscription.dispose()
    }, [api])

    return useDockviewValue(
        useCallback(() => group.api.isCollapsed(), [group]),
        useCallback(
            (listener) => group.api.onDidCollapsedChange(listener),
            [group]
        )
    )
}

/* The body of a panel in the tools strip. A collapsed strip keeps its
 * panels mounted but out of sight, so they are made inert: Tab would
 * otherwise walk through tiles and settings nobody can see. */
export const ToolPanel: FC<{
    api: DockviewPanelApi
    dataTest?: string
    children: ReactNode
}> = ({ api, dataTest, children }) => {
    const isCollapsed = useIsGroupCollapsed(api)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        ref.current?.toggleAttribute('inert', isCollapsed)
    }, [isCollapsed])

    return (
        <div ref={ref} className={classes.tool} data-test={dataTest}>
            {children}
        </div>
    )
}
