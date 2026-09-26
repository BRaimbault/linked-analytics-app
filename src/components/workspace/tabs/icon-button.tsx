import { Tooltip } from '@dhis2/ui'
import type { FC, MutableRefObject, ReactElement } from 'react'
import classes from './styles/tabs.module.css'

/* Borderless, to match dockview's own tab close button. The tooltip's
 * handlers go on the button itself: with a plain child, Tooltip wraps it in
 * a focusable span, a second Tab stop for every button. */
export const IconButton: FC<{
    label: string
    icon: ReactElement
    dataTest: string
    onClick: () => void
}> = ({ label, icon, dataTest, onClick }) => (
    <Tooltip content={label}>
        {({ ref, ...handlers }) => (
            <button
                {...handlers}
                ref={ref as MutableRefObject<HTMLButtonElement>}
                type="button"
                className={classes.iconButton}
                aria-label={label}
                data-test={dataTest}
                onClick={onClick}
            >
                {icon}
            </button>
        )}
    </Tooltip>
)
