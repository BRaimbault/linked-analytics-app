import { IconMore16 } from '@dhis2/ui'
import { useRef, useState, type FC, type ReactNode } from 'react'
import { ActionsPopover, type MenuAction } from './actions-popover'
import { IconButton } from './icon-button'

export type { MenuAction } from './actions-popover'

/* A menu button: focus goes back to the button when the menu closes,
 * unless the chosen action moved it elsewhere. The button is a ⋯ icon,
 * unless `renderButton` draws another one (a channel's badge). */
export const ActionsMenu: FC<{
    label: string
    dataTest: string
    actions: MenuAction[]
    renderButton?: (toggle: () => void) => ReactNode
}> = ({ label, dataTest, actions, renderButton }) => {
    const anchorRef = useRef<HTMLSpanElement>(null)
    const [isOpen, setIsOpen] = useState(false)

    const close = (restoreFocus: boolean) => {
        setIsOpen(false)
        if (restoreFocus) {
            anchorRef.current?.querySelector<HTMLElement>('button')?.focus()
        }
    }
    const toggle = () => setIsOpen((open) => !open)

    return (
        /* The menu opens in a layer outside the header: the mark keeps a
         * header shown only on hover visible while its menu is open */
        <span ref={anchorRef} data-menu-open={isOpen || undefined}>
            {renderButton ? (
                renderButton(toggle)
            ) : (
                <IconButton
                    label={label}
                    icon={<IconMore16 />}
                    dataTest={dataTest}
                    onClick={toggle}
                />
            )}
            {isOpen && (
                <ActionsPopover
                    reference={anchorRef}
                    placement="bottom-end"
                    actions={actions}
                    onClose={close}
                />
            )}
        </span>
    )
}
