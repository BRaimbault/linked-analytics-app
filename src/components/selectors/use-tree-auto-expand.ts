import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

/* Loading a level's children shows in the tree over a few frames */
const SETTLE_DELAY = 150

const depthOf = (path: string) => path.split('/').filter(Boolean).length

/* Opening as the tree first shows, hidden; again, shown, when its box
 * grows; or not */
type Phase = 'first' | 'growing' | 'idle'

/* Opens a tree level by level while it fits its box: the next level is
 * opened, and closed again if the tree then overflows. How many units a
 * level holds is known only once it is open. It stops at the deepest
 * level, or as soon as the user opens, closes or selects, and starts again
 * when the box grows, unless the user closed a branch. `isSettling` tells
 * the tree to stay hidden the first time, so a level tried and closed
 * again doesn't flash. */
export const useTreeAutoExpand = ({
    boxRef,
    expanded,
    setExpanded,
    deepestLevel,
}: {
    boxRef: RefObject<HTMLElement | null>
    expanded: string[]
    setExpanded: (paths: string[]) => void
    deepestLevel: number
}): {
    isSettling: boolean
    onChildrenLoaded: (node: {
        path: string
        children: { path: string }[]
    }) => void
    stop: () => void
    onUserClose: () => void
} => {
    const [phase, setPhase] = useState<Phase>('first')
    const childrenOf = useRef(new Map<string, string[]>())
    const lastLevel = useRef<string[]>([])
    const hasUserClosed = useRef(false)
    const [loads, setLoads] = useState(0)

    const onChildrenLoaded = useCallback(
        ({
            path,
            children,
        }: {
            path: string
            children: { path: string }[]
        }) => {
            childrenOf.current.set(
                path,
                children.map((child) => child.path)
            )
            setLoads((count) => count + 1)
        },
        []
    )
    const stop = useCallback(() => setPhase('idle'), [])
    const onUserClose = useCallback(() => {
        hasUserClosed.current = true
        setPhase('idle')
    }, [])

    /* A box that grows has room for more levels */
    useEffect(() => {
        const box = boxRef.current as HTMLElement
        let height = box.clientHeight
        const observer = new ResizeObserver(() => {
            const hasGrown = box.clientHeight > height + 1
            height = box.clientHeight
            if (hasGrown && !hasUserClosed.current) {
                lastLevel.current = []
                setPhase((current) =>
                    current === 'idle' ? 'growing' : current
                )
            }
        })
        observer.observe(box)
        return () => observer.disconnect()
    }, [boxRef])

    useEffect(() => {
        if (phase === 'idle') {
            return
        }
        const timer = setTimeout(() => {
            const box = boxRef.current as HTMLElement
            if (box.scrollHeight > box.clientHeight + 1) {
                const closing = new Set(lastLevel.current)
                setExpanded(expanded.filter((path) => !closing.has(path)))
                setPhase('idle')
                return
            }
            const open = new Set(expanded)
            const next = expanded.flatMap((path) =>
                (childrenOf.current.get(path) ?? []).filter(
                    (child) => !open.has(child) && depthOf(child) < deepestLevel
                )
            )
            if (next.length) {
                lastLevel.current = next
                setExpanded([...expanded, ...next])
            } else {
                setPhase('idle')
            }
        }, SETTLE_DELAY)
        return () => clearTimeout(timer)
    }, [phase, loads, expanded, setExpanded, boxRef, deepestLevel])

    return {
        isSettling: phase === 'first',
        onChildrenLoaded,
        stop,
        onUserClose,
    }
}
