import {
    canDropOnInsertZone,
    dropOnInsertZone,
} from '@components/workspace/controller/drops'
import { useDropTarget } from '@components/workspace/use-drop-target'
import type { InsertZone } from '@modules/workspace/insert-zones'
import type { DockviewApi } from 'dockview-react'
import type { FC } from 'react'
import classes from './styles/insert-zones.module.css'

/* One strip; the insertion line shows while a drag it takes is over it */
export const InsertZoneStrip: FC<{ api: DockviewApi; zone: InsertZone }> = ({
    api,
    zone,
}) => {
    const { isActive, handlers } = useDropTarget({
        canDrop: (dataTransfer) => canDropOnInsertZone(api, dataTransfer),
        onDrop: (dataTransfer) => dropOnInsertZone(api, zone, dataTransfer),
    })

    return (
        <div
            className={classes.insertZone}
            data-test="insert-zone"
            data-axis={zone.axis}
            data-edge={zone.referenceId === null ? zone.position : undefined}
            data-active={isActive || undefined}
            style={{
                left: zone.rect.left,
                top: zone.rect.top,
                width: zone.rect.width,
                height: zone.rect.height,
            }}
            {...handlers}
        />
    )
}
