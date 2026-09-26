import { getInsertZonesForDrag } from '@components/workspace/controller/drops'
import type { InsertZone } from '@modules/workspace/insert-zones'
import type { DockviewApi } from 'dockview-react'
import { useEffect, useRef, useState, type FC } from 'react'
import { InsertZoneStrip } from './insert-zone-strip'
import classes from './styles/insert-zones.module.css'

/* Strips shown during a drag where a view can be dropped to become a new
 * line: over the dividers between lines, which dockview does not offer,
 * and along the grid's outer edges, so both show the same insertion line. */
export const InsertZones: FC<{
    api: DockviewApi | null
    /* The formats of the drag in progress, null when there is none */
    dragFormats: readonly string[] | null
}> = ({ api, dragFormats }) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [zones, setZones] = useState<InsertZone[]>([])

    useEffect(() => {
        const container = containerRef.current
        if (!dragFormats || !api || !container) {
            setZones([])
            return
        }
        /* Read once the drag has started, when dockview knows which tab
         * is being dragged */
        const timeout = window.setTimeout(() =>
            setZones(getInsertZonesForDrag(api, container, dragFormats))
        )
        return () => window.clearTimeout(timeout)
    }, [api, dragFormats])

    return (
        <div ref={containerRef} className={classes.insertZones}>
            {api &&
                zones.map((zone) => (
                    <InsertZoneStrip
                        key={`${zone.referenceId}-${zone.position}`}
                        api={api}
                        zone={zone}
                    />
                ))}
        </div>
    )
}
