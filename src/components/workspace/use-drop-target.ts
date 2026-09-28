import { useState, type DragEvent } from 'react'

/* Drop handlers for an element that takes some drags: it is active while
 * an accepted drag is over it, children included */
export const useDropTarget = ({
    canDrop,
    onDrop,
}: {
    canDrop: (dataTransfer: DataTransfer | null) => boolean
    onDrop: (dataTransfer: DataTransfer | null) => void
}) => {
    const [isActive, setIsActive] = useState(false)

    const onDragOver = (event: DragEvent) => {
        if (canDrop(event.dataTransfer)) {
            event.preventDefault()
            setIsActive(true)
        }
    }

    return {
        isActive,
        handlers: {
            onDragEnter: onDragOver,
            onDragOver,
            onDragLeave: (event: DragEvent) => {
                if (
                    !event.currentTarget.contains(event.relatedTarget as Node)
                ) {
                    setIsActive(false)
                }
            },
            onDrop: (event: DragEvent) => {
                event.preventDefault()
                setIsActive(false)
                onDrop(event.dataTransfer)
            },
        },
    }
}
