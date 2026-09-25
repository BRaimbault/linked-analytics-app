import { ViewTypeIcon } from '@components/workspace/view-type-icon'
import i18n from '@dhis2/d2-i18n'
import { useAppSelector } from '@hooks'
import { getViewTitle } from '@modules/workspace/view-types'
import { selectViews } from '@store/workspace-slice'
import type { FC } from 'react'
import classes from './styles/panels.module.css'

export const InteractionsPanel: FC = () => {
    const views = useAppSelector(selectViews)

    return (
        <div className={classes.tool} data-test="interactions-panel">
            <p className={classes.toolHint}>
                {i18n.t(
                    'Interactions between these views will be configured here.'
                )}
            </p>
            {views.length ? (
                <ul className={classes.viewList}>
                    {views.map((view) => (
                        <li key={view.id} className={classes.viewListItem}>
                            <ViewTypeIcon type={view.type} />
                            {getViewTitle(view.type, view.number)}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className={classes.toolHint}>{i18n.t('No views yet.')}</p>
            )}
        </div>
    )
}
