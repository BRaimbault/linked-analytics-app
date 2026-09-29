import i18n from '@dhis2/d2-i18n'
import { IconInfo16 } from '@dhis2/ui'
import type { FC } from 'react'
import classes from './styles/demo-banner.module.css'

/* Always shown in demo mode, so a screenshot can't pass for real data */
export const DemoBanner: FC = () => (
    <div className={classes.banner} role="status" data-test="demo-banner">
        <IconInfo16 />
        <span>{i18n.t('Demo data. Nothing here comes from the server.')}</span>
    </div>
)
