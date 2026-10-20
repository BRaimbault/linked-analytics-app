import { useEffect, useRef, useState, type PointerEvent } from 'react'

const ZOOM_STEP = 1.25
const MIN_ZOOM = 1
const MAX_ZOOM = 8
/* A pointer that moves less than this between down and up clicks */
const CLICK_SLOP = 4

export type MapView = { zoom: number; x: number; y: number }

const WHOLE_MAP: MapView = { zoom: 1, x: 0, y: 0 }

const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))

/* The fake map's own zoom and pan: the wheel, a drag, and the buttons.
 * `fit` is the screen pixels per plane unit at zoom 1; `isClick` tells a
 * feature's click from the end of a drag. */
export const useMapView = ({
    fit,
    hasCanvas,
}: {
    fit: number
    hasCanvas: boolean
}) => {
    const [view, setView] = useState<MapView>(WHOLE_MAP)
    const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)

    const zoomBy = (factor: number) =>
        setView((current) => ({
            ...current,
            zoom: clampZoom(current.zoom * factor),
        }))

    /* The wheel zooms the map instead of scrolling the page: React's wheel
     * listeners are passive and can't stop the scroll, so this one is
     * added by hand */
    const canvasRef = useRef<SVGSVGElement>(null)
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) {
            return
        }
        const onWheel = (event: WheelEvent) => {
            event.preventDefault()
            zoomBy(event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP)
        }
        canvas.addEventListener('wheel', onWheel, { passive: false })
        return () => canvas.removeEventListener('wheel', onWheel)
    }, [hasCanvas])

    const onPointerDown = (event: PointerEvent) => {
        drag.current = { x: event.clientX, y: event.clientY, moved: false }
    }
    const onPointerMove = (event: PointerEvent) => {
        const start = drag.current
        /* Only while the primary button is down */
        if (!start || !(event.buttons & 1)) {
            return
        }
        const dx = event.clientX - start.x
        const dy = event.clientY - start.y
        if (Math.abs(dx) + Math.abs(dy) >= CLICK_SLOP) {
            start.moved = true
        }
        if (start.moved) {
            drag.current = { x: event.clientX, y: event.clientY, moved: true }
            setView((current) => ({
                ...current,
                x: current.x + dx / (fit * current.zoom),
                y: current.y + dy / (fit * current.zoom),
            }))
        }
    }
    /* A press that didn't move ends now; one that dragged ends after the
     * click that follows it, which must not count as a feature click */
    const onPointerUp = () => {
        if (drag.current?.moved) {
            setTimeout(() => {
                drag.current = null
            })
        } else {
            drag.current = null
        }
    }
    const isClick = () => {
        const wasDrag = drag.current?.moved
        drag.current = null
        return !wasDrag
    }

    return {
        view,
        canvasRef,
        canvasHandlers: { onPointerDown, onPointerMove, onPointerUp },
        isClick,
        zoomIn: () => zoomBy(ZOOM_STEP),
        zoomOut: () => zoomBy(1 / ZOOM_STEP),
        showWholeMap: () => setView(WHOLE_MAP),
    }
}
