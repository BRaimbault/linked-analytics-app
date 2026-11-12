import { ActionsPopover } from '@components/workspace/tabs/actions-popover'
import type { LinkItem } from '@modules/interactions/apply-links'
import { useEffect, useMemo, type FC } from 'react'
import { useDrillActions } from './use-drill-actions'

/* The menu a right-click on a plugin's point opens at the pointer: drill
 * down into the org unit clicked, or back up. With nothing to offer (a
 * period, the deepest level, not drilled), it closes at once. */
export const DrillMenu: FC<{
    viewId: string
    clicked: LinkItem | undefined
    position: { x: number; y: number }
    onClose: () => void
}> = ({ viewId, clicked, position, onClose }) => {
    const actions = useDrillActions(viewId, clicked)
    const hasActions = actions.length > 0

    useEffect(() => {
        if (!hasActions) {
            onClose()
        }
    }, [hasActions, onClose])

    /* A point, for the menu to open from */
    const reference = useMemo(
        () => ({
            getBoundingClientRect: () =>
                DOMRect.fromRect({ x: position.x, y: position.y }),
        }),
        [position.x, position.y]
    )

    if (!hasActions) {
        return null
    }
    return (
        <ActionsPopover
            reference={reference}
            placement="bottom-start"
            actions={actions}
            dataTest="drill-menu"
            onClose={onClose}
        />
    )
}
