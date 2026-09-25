import {
    canDropOnInsertZone,
    dropOnInsertZone,
    getInsertZonesForDrag,
} from '@components/workspace/workspace-controller'
import type { InsertZone } from '@modules/workspace/insert-zones'
import type { DockviewApi } from 'dockview-react'
import { useEffect, useRef, useState, type DragEvent, type FC } from 'react'
import classes from './styles/workspace.module.css'

/* Strips shown during a drag where a view can be dropped to become a new
 * line: over the dividers between lines, which dockview does not offer,
 * and along the grid's outer edges, so both show the same insertion line. */
export const InsertZones: FC<{
    api: DockviewApi | null
    isDragging: boolean
}> = ({ api, isDragging }) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [zones, setZones] = useState<InsertZone[]>([])
    const [activeZone, setActiveZone] = useState<InsertZone | null>(null)

    useEffect(() => {
        const container = containerRef.current
        if (!isDragging || !api || !container) {
            setZones([])
            setActiveZone(null)
            return
        }
        /* Read once the drag has started, when dockview knows which tab
         * is being dragged */
        const timeout = window.setTimeout(() =>
            setZones(getInsertZonesForDrag(api, container))
        )
        return () => window.clearTimeout(timeout)
    }, [api, isDragging])

    const onDragOver = (event: DragEvent, zone: InsertZone) => {
        if (api && canDropOnInsertZone(api, event.dataTransfer)) {
            event.preventDefault()
            setActiveZone(zone)
        }
    }

    return (
        <div ref={containerRef} className={classes.insertZones}>
            {api &&
                zones.map((zone) => (
                    <div
                        key={`${zone.referenceId}-${zone.position}`}
                        className={classes.insertZone}
                        data-test="insert-zone"
                        data-axis={zone.axis}
                        data-edge={
                            zone.referenceId === null
                                ? zone.position
                                : undefined
                        }
                        data-active={zone === activeZone || undefined}
                        style={{
                            left: zone.rect.left,
                            top: zone.rect.top,
                            width: zone.rect.width,
                            height: zone.rect.height,
                        }}
                        onDragEnter={(event) => onDragOver(event, zone)}
                        onDragOver={(event) => onDragOver(event, zone)}
                        onDragLeave={() =>
                            setActiveZone((active) =>
                                active === zone ? null : active
                            )
                        }
                        onDrop={(event) => {
                            event.preventDefault()
                            setActiveZone(null)
                            dropOnInsertZone(api, zone, event.dataTransfer)
                        }}
                    />
                ))}
        </div>
    )
}
