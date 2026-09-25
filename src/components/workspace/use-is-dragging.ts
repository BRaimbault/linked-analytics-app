import { useEffect, useState } from 'react'

/* True while any HTML5 drag is in progress anywhere on the page, whether
 * from the palette or a view's tab. */
export const useIsDragging = (): boolean => {
    const [isDragging, setIsDragging] = useState(false)

    useEffect(() => {
        const start = () => setIsDragging(true)
        const stop = () => setIsDragging(false)
        document.addEventListener('dragstart', start, true)
        document.addEventListener('dragend', stop, true)
        document.addEventListener('drop', stop, true)
        return () => {
            document.removeEventListener('dragstart', start, true)
            document.removeEventListener('dragend', stop, true)
            document.removeEventListener('drop', stop, true)
        }
    }, [])

    return isDragging
}
