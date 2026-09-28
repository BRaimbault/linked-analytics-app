import { isWorkspaceDrag } from '@components/workspace/controller/drags'
import { useEffect, useState } from 'react'

/* The formats carried by the workspace's HTML5 drag in progress (a palette
 * tile or a tab), or null when none is dragged.
 * dragstart is read as it bubbles up, once the source has set its data;
 * the drag data itself can only be read on drop. */
export const useCurrentDrag = (): readonly string[] | null => {
    const [formats, setFormats] = useState<readonly string[] | null>(null)

    useEffect(() => {
        /* A cancelled drag never ends, so it must not start either; a drag
         * that isn't the workspace's (text in a note) leaves it alone */
        const start = (event: DragEvent) => {
            if (!event.defaultPrevented && isWorkspaceDrag(event)) {
                setFormats([...(event.dataTransfer?.types ?? [])])
            }
        }
        const stop = () => setFormats(null)
        document.addEventListener('dragstart', start)
        document.addEventListener('dragend', stop, true)
        document.addEventListener('drop', stop, true)
        return () => {
            document.removeEventListener('dragstart', start)
            document.removeEventListener('dragend', stop, true)
            document.removeEventListener('drop', stop, true)
        }
    }, [])

    return formats
}
