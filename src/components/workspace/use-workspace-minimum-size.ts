import { getWorkspaceMinimumSize } from '@components/workspace/controller/minimum-size'
import { useDockviewValue } from '@components/workspace/use-dockview-value'
import type { DockviewApi } from 'dockview-react'
import { useCallback, useMemo, type CSSProperties } from 'react'

const NO_SUBSCRIPTION = { dispose: () => {} }

/* dockview clips views that don't fit its element, with no way to scroll
 * to them. Growing the element to the views' minimums instead lets the
 * app scroll, e.g. in a narrow window. Read as numbers, so the many layout
 * changes of a divider drag re-render nothing. */
export const useWorkspaceMinimumSize = (
    api: DockviewApi | null
): CSSProperties => {
    const subscribe = useCallback(
        (listener: () => void) =>
            api?.onDidLayoutChange(listener) ?? NO_SUBSCRIPTION,
        [api]
    )
    const readWidth = useCallback(
        () => (api ? getWorkspaceMinimumSize(api).width : 0),
        [api]
    )
    const readHeight = useCallback(
        () => (api ? getWorkspaceMinimumSize(api).height : 0),
        [api]
    )
    const minInlineSize = useDockviewValue(readWidth, subscribe)
    const minBlockSize = useDockviewValue(readHeight, subscribe)
    return useMemo(
        () => ({ minInlineSize, minBlockSize }),
        [minInlineSize, minBlockSize]
    )
}
