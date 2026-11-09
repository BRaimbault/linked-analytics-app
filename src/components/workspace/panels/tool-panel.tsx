import { fitToolsToOpenPanel } from '@components/workspace/controller/settings'
import { useDockviewValue } from '@components/workspace/use-dockview-value'
import { useWorkspaceApi } from '@components/workspace/workspace-api-context'
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
 * otherwise walk through tiles and settings nobody can see. The open
 * panel sizes the strip to its content, as it opens and as it changes. */
export const ToolPanel: FC<{
    api: DockviewPanelApi
    dataTest?: string
    children: ReactNode
}> = ({ api, dataTest, children }) => {
    const isCollapsed = useIsGroupCollapsed(api)
    const workspaceApi = useWorkspaceApi()
    const ref = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        ref.current?.toggleAttribute('inert', isCollapsed)
    }, [isCollapsed])

    useEffect(() => {
        const content = contentRef.current
        if (!workspaceApi || !content || isCollapsed) {
            return
        }
        /* On the next frame: resizing the strip from the observer's own
         * callback would make the browser report a resize loop */
        let frame = 0
        const fit = () => {
            cancelAnimationFrame(frame)
            frame = requestAnimationFrame(() =>
                fitToolsToOpenPanel(workspaceApi, api.id)
            )
        }
        const observer = new ResizeObserver(fit)
        observer.observe(content)
        const subscription = api.onDidVisibilityChange(fit)
        return () => {
            cancelAnimationFrame(frame)
            observer.disconnect()
            subscription.dispose()
        }
    }, [workspaceApi, api, isCollapsed])

    return (
        <div
            ref={ref}
            className={classes.tool}
            data-test={dataTest}
            data-tool-panel
        >
            <div ref={contentRef} className={classes.toolContent}>
                {children}
            </div>
        </div>
    )
}
