import { FlyoutMenu, IconMore16, MenuItem, Popover } from '@dhis2/ui'
import { useEffect, useRef, useState, type FC, type KeyboardEvent } from 'react'
import { IconButton } from './icon-button'

type MenuAction = {
    key: string
    label: string
    dataTest: string
    onClick: () => void
}

/* A menu button: the menu takes focus when it opens, so its items can be
 * reached with the arrow keys; Escape or Tab closes it, and focus goes back
 * to the button unless the chosen action moved it elsewhere */
export const ActionsMenu: FC<{
    label: string
    dataTest: string
    actions: MenuAction[]
}> = ({ label, dataTest, actions }) => {
    const anchorRef = useRef<HTMLSpanElement>(null)
    const [isOpen, setIsOpen] = useState(false)
    /* The popover mounts its content a render later, so the menu is kept
     * in state and focused once it's there */
    const [menu, setMenu] = useState<HTMLDivElement | null>(null)

    useEffect(() => {
        /* The flyout menu passes its focus on to the first item */
        menu?.querySelector<HTMLElement>('[tabindex]')?.focus()
    }, [menu])

    const focusButton = () =>
        anchorRef.current?.querySelector<HTMLElement>('button')?.focus()

    const close = () => {
        setIsOpen(false)
        focusButton()
    }

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Tab') {
            event.preventDefault()
            close()
        }
    }

    const choose = (action: MenuAction) => {
        setIsOpen(false)
        action.onClick()
        const focusStayedInMenu = menu?.contains(document.activeElement)
        if (focusStayedInMenu) {
            focusButton()
        }
    }

    return (
        <span ref={anchorRef}>
            <IconButton
                label={label}
                icon={<IconMore16 />}
                dataTest={dataTest}
                onClick={() => setIsOpen((open) => !open)}
            />
            {isOpen && (
                <Popover
                    reference={anchorRef}
                    placement="bottom-end"
                    arrow={false}
                    onClickOutside={() => setIsOpen(false)}
                >
                    <div ref={setMenu} onKeyDown={onKeyDown}>
                        <FlyoutMenu dense closeMenu={close}>
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
            )}
        </span>
    )
}
