import { FlyoutMenu, IconMore16, MenuItem, Popover } from '@dhis2/ui'
import { useRef, useState, type FC } from 'react'
import { IconButton } from './icon-button'

export type MenuAction = {
    key: string
    label: string
    dataTest: string
    onClick: () => void
}

export const ActionsMenu: FC<{
    label: string
    dataTest: string
    actions: MenuAction[]
}> = ({ label, dataTest, actions }) => {
    const anchorRef = useRef<HTMLSpanElement>(null)
    const [isOpen, setIsOpen] = useState(false)

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
                    <FlyoutMenu dense>
                        {actions.map((action) => (
                            <MenuItem
                                key={action.key}
                                dataTest={action.dataTest}
                                label={action.label}
                                onClick={() => {
                                    setIsOpen(false)
                                    action.onClick()
                                }}
                            />
                        ))}
                    </FlyoutMenu>
                </Popover>
            )}
        </span>
    )
}
