import { useEffect, useState, type RefObject } from 'react'

export type Size = { width: number; height: number }

/* An element's size, kept up to date as it resizes, or null before it is
 * measured or while it has no size (a hidden view). A plugin is sized from
 * its view's body, not from dockview's content size, which leaves out the
 * header even while it floats over the view. */
export const useElementSize = (
    ref: RefObject<HTMLElement | null>
): Size | null => {
    const [size, setSize] = useState<Size | null>(null)

    useEffect(() => {
        /* Set by the time effects run: the element is always rendered */
        const element = ref.current as HTMLElement
        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect
            setSize((current) => {
                if (!width || !height) {
                    return null
                }
                return current?.width === width && current.height === height
                    ? current
                    : { width, height }
            })
        })
        observer.observe(element)
        return () => observer.disconnect()
    }, [ref])

    return size
}
