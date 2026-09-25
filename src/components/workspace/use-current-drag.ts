import { useEffect, useState } from 'react'

/* The formats carried by the HTML5 drag in progress anywhere on the page
 * (a palette tile or a view's tab), or null when nothing is dragged.
 * dragstart is read as it bubbles up, once the source has set its data;
 * the drag data itself can only be read on drop. */
export const useCurrentDrag = (): readonly string[] | null => {
    const [formats, setFormats] = useState<readonly string[] | null>(null)

    useEffect(() => {
        const start = (event: DragEvent) =>
            setFormats([...(event.dataTransfer?.types ?? [])])
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
