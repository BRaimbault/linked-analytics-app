import { FlyoutMenu, MenuItem, Popover } from '@dhis2/ui'
import {
    useEffect,
    useState,
    type ComponentProps,
    type FC,
    type KeyboardEvent,
} from 'react'

export type MenuAction = {
    key: string
    label: string
    dataTest: string
    onClick: () => void
}

type PopoverProps = ComponentProps<typeof Popover>

/* A menu of actions by an element, or at a point (a virtual element). It
 * takes focus when it opens, so its items can be reached with the arrow
 * keys; Escape or Tab closes it. `onClose` says whether focus should go
 * back where it came from: after Escape, Tab or an action that left it in
 * the menu, not after a click elsewhere. */
export const ActionsPopover: FC<{
    reference: PopoverProps['reference']
    placement: PopoverProps['placement']
    actions: MenuAction[]
    dataTest?: string
    onClose: (restoreFocus: boolean) => void
}> = ({ reference, placement, actions, dataTest, onClose }) => {
    /* The popover mounts its content a render later, so the menu is kept
     * in state and focused once it's there */
    const [menu, setMenu] = useState<HTMLDivElement | null>(null)

    useEffect(() => {
        /* The flyout menu passes its focus on to the first item */
        menu?.querySelector<HTMLElement>('[tabindex]')?.focus()
    }, [menu])

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Tab') {
            event.preventDefault()
            onClose(true)
        }
    }

    const choose = (action: MenuAction) => {
        action.onClick()
        onClose(Boolean(menu?.contains(document.activeElement)))
    }

    return (
        <Popover
            reference={reference}
            placement={placement}
            arrow={false}
            dataTest={dataTest}
            onClickOutside={() => onClose(false)}
        >
            <div ref={setMenu} onKeyDown={onKeyDown}>
                <FlyoutMenu dense closeMenu={() => onClose(true)}>
                    {actions.map((action) => (
                        <MenuItem
                            key={action.key}
                            dataTest={action.dataTest}
                            label={action.label}
                            onClick={() => choose(action)}
                        />
                    ))}
                </FlyoutMenu>
            </div>
        </Popover>
    )
}
