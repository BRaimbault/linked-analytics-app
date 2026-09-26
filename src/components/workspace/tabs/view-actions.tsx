import { swapViewsById } from '@components/workspace/controller/swap-views'
import { useDockviewValue } from '@components/workspace/use-dockview-value'
import i18n from '@dhis2/d2-i18n'
import { IconFullscreen16, IconFullscreenExit16 } from '@dhis2/ui'
import { useAppSelector } from '@hooks'
import { getViewTitle } from '@modules/workspace/view-types'
import { selectViews } from '@store/workspace-slice'
import type {
    DockviewApi,
    IDockviewHeaderActionsProps,
    IDockviewPanel,
} from 'dockview-react'
import { useCallback, type FC } from 'react'
import { ActionsMenu } from './actions-menu'
import { IconButton } from './icon-button'
import classes from './styles/tabs.module.css'

/* Swapping by dragging a tab onto another view needs a pointer; the menu
 * does the same from the keyboard. */
const SwapMenu: FC<{ api: DockviewApi; view: IDockviewPanel }> = ({
    api,
    view,
}) => {
    const views = useAppSelector(selectViews)
    const targets = views.filter(({ id }) => id !== view.id)

    if (!targets.length) {
        return null
    }

    return (
        <ActionsMenu
            label={i18n.t('View actions')}
            dataTest="view-actions-button"
            actions={targets.map((target) => ({
                key: target.id,
                label: i18n.t('Swap with {{title}}', {
                    title: getViewTitle(target.type, target.number),
                    interpolation: { escapeValue: false },
                }),
                dataTest: `swap-with-${target.id}`,
                onClick: () => swapViewsById(api, view.id, target.id),
            }))}
        />
    )
}

export const ViewActions: FC<IDockviewHeaderActionsProps> = ({
    api,
    containerApi,
    activePanel,
}) => {
    const isMaximized = useDockviewValue(
        useCallback(() => api.isMaximized(), [api]),
        useCallback(
            (listener) => containerApi.onDidMaximizedGroupChange(listener),
            [containerApi]
        )
    )

    return (
        <div className={classes.headerActions}>
            {activePanel && !isMaximized && (
                <SwapMenu api={containerApi} view={activePanel} />
            )}
            <IconButton
                label={isMaximized ? i18n.t('Restore') : i18n.t('Maximize')}
                icon={
                    isMaximized ? (
                        <IconFullscreenExit16 />
                    ) : (
                        <IconFullscreen16 />
                    )
                }
                dataTest="maximize-view-button"
                onClick={() =>
                    isMaximized ? api.exitMaximized() : api.maximize()
                }
            />
        </div>
    )
}
