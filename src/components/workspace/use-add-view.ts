import { addView } from '@components/workspace/controller/add-view'
import { useAlert } from '@dhis2/app-runtime'
import i18n from '@dhis2/d2-i18n'
import { useAppSelector } from '@hooks'
import { getViewLimitMessage } from '@modules/workspace/view-limits'
import type { ViewType } from '@modules/workspace/view-types'
import { selectViews } from '@store/workspace-slice'
import type { DockviewApi } from 'dockview-react'
import { useCallback } from 'react'

export const useAddView = (
    api: DockviewApi | null
): ((type: ViewType) => void) => {
    const { show } = useAlert((message: string) => message, { warning: true })
    const views = useAppSelector(selectViews)

    return useCallback(
        (type: ViewType) => {
            if (!api) {
                return
            }
            const result = addView(api, type)
            if (result.status === 'no-room') {
                show(
                    i18n.t(
                        'There is no room for another view. Make the window larger, or close or resize a view.'
                    )
                )
            } else if (result.status === 'full') {
                show(getViewLimitMessage(type, views))
            }
        },
        [api, show, views]
    )
}
