import type {
    DroptargetOverlayModel,
    DropOverlayModelParams,
} from 'dockview-react'

/* dockview's band at the grid's outer edges is 10px; 48px makes adding or
 * moving a view to an edge easy to hit */
const OUTER_EDGE_DROP_MODEL: DroptargetOverlayModel = {
    activationSize: { type: 'pixels', value: 48 },
    size: { type: 'percentage', value: 25 },
}

/* The outer edges are InsertZones, like the lines between views, but those
 * only take mouse drags. On a touch screen dockview drags with pointer
 * events (it checks the same media queries), so its own outer edges stay. */
export const getOuterEdgeDropModel = (): DroptargetOverlayModel | false =>
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches &&
    !window.matchMedia('(pointer: fine)').matches &&
    OUTER_EDGE_DROP_MODEL

/* Within a cell, dockview gives 20% per side to splits, which leaves most
 * of the cell to swapping; a third per side leaves the middle third */
const CELL_DROP_MODEL: DroptargetOverlayModel = {
    activationSize: { type: 'percentage', value: 33 },
}
export const getDropOverlayModel = ({ location }: DropOverlayModelParams) =>
    location === 'content' ? CELL_DROP_MODEL : undefined
