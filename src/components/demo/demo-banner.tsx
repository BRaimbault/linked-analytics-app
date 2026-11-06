import i18n from '@dhis2/d2-i18n'
import { IconInfo16 } from '@dhis2/ui'
import type { FC } from 'react'
import classes from './styles/demo-banner.module.css'
import type { TourKind } from './tour/tour-steps'

/* Always shown in demo mode, so a screenshot can't pass for real data.
 * The tours are links in the banner's own color, so they don't compete
 * with the views. */
export const DemoBanner: FC<{ onTakeTour: (kind: TourKind) => void }> = ({
    onTakeTour,
}) => (
    <div className={classes.banner} role="status" data-test="demo-banner">
        <IconInfo16 />
        <span>{i18n.t('Demo data. Nothing here comes from the server.')}</span>
        <span className={classes.tours}>
            {i18n.t('Take a tour')}
            <button
                type="button"
                className={classes.tourLink}
                data-test="take-tour-story"
                onClick={() => onTakeTour('story')}
            >
                {i18n.t('The story')}
            </button>
            <span aria-hidden="true">·</span>
            <button
                type="button"
                className={classes.tourLink}
                data-test="take-tour-how-it-works"
                onClick={() => onTakeTour('how-it-works')}
            >
                {i18n.t('How it works')}
            </button>
        </span>
    </div>
)
