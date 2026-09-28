import type { ViewType } from '@modules/workspace/view-types'

/* The palette tile being dragged. A drag's data goes through the operating
 * system, which may lose custom formats on the way (the page then sees a
 * drag with none), so the page also keeps it, as dockview does for its
 * tabs. It ends on dragend, or after a drop in case the tile is gone from
 * the page by then (its dragend then never reaches the document). */
let draggedTile: ViewType | null = null
let pendingEnd: ReturnType<typeof setTimeout> | undefined

export const endTileDrag = (): void => {
    clearTimeout(pendingEnd)
    draggedTile = null
    document.removeEventListener('dragend', endTileDrag, true)
    document.removeEventListener('drop', endTileDragAfterDrop, true)
}

/* The drop's own handlers still read the tile */
const endTileDragAfterDrop = (): void => {
    pendingEnd = setTimeout(endTileDrag)
}

export const startTileDrag = (type: ViewType): void => {
    endTileDrag()
    draggedTile = type
    document.addEventListener('dragend', endTileDrag, true)
    document.addEventListener('drop', endTileDragAfterDrop, true)
}

export const getDraggedTile = (): ViewType | null => draggedTile
