import type { FC } from 'react'
import classes from './styles/selector-header.module.css'

/* A selector's channel name, and its value as text: a control with no
 * place for it (a track, a tree) still says what is selected */
export const SelectorHeader: FC<{ label: string; valueText: string }> = ({
    label,
    valueText,
}) => (
    <div className={classes.header}>
        <span className={classes.label}>{label}</span>
        <span className={classes.value} data-test="selector-value">
            {valueText}
        </span>
    </div>
)
