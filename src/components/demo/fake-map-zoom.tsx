import i18n from '@dhis2/d2-i18n'
import { IconAdd16, IconHome16, IconSubtract16 } from '@dhis2/ui'
import type { FC } from 'react'
import classes from './styles/fake-map.module.css'

/* Maps' zoom control: in, out, and back to the whole map */
export const FakeMapZoom: FC<{
    zoomIn: () => void
    zoomOut: () => void
    showWholeMap: () => void
}> = ({ zoomIn, zoomOut, showWholeMap }) => (
    <div className={classes.zoom}>
        {[
            {
                label: i18n.t('Zoom in'),
                icon: <IconAdd16 />,
                dataTest: 'fake-map-zoom-in',
                onClick: zoomIn,
            },
            {
                label: i18n.t('Zoom out'),
                icon: <IconSubtract16 />,
                dataTest: 'fake-map-zoom-out',
                onClick: zoomOut,
            },
            {
                label: i18n.t('Whole map'),
                icon: <IconHome16 />,
                dataTest: 'fake-map-reset',
                onClick: showWholeMap,
            },
        ].map(({ label, icon, dataTest, onClick }) => (
            <button
                key={dataTest}
                type="button"
                className={classes.zoomButton}
                aria-label={label}
                title={label}
                data-test={dataTest}
                onClick={onClick}
            >
                {icon}
            </button>
        ))}
    </div>
)
