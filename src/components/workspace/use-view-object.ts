import {
    getViewObject,
    onViewParamsChange,
} from '@components/workspace/controller/views'
import type { PluginObject } from '@modules/plugins/contract'
import type { DockviewApi } from 'dockview-react'
import { useCallback } from 'react'
import { useDockviewValue } from './use-dockview-value'

/* The saved item a view shows, read again when it changes */
export const useViewObject = (
    api: DockviewApi,
    viewId: string
): PluginObject | undefined =>
    useDockviewValue(
        useCallback(() => getViewObject(api, viewId), [api, viewId]),
        useCallback(
            (listener) => onViewParamsChange(api, viewId, listener),
            [api, viewId]
        )
    )
