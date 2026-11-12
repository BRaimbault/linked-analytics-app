import type { LinkDimension } from '@modules/interactions/channels'
import type { ViewSizes } from '@modules/workspace/grid-tree'

/* How a selector shows its values: a drop-down of its short list, a
 * timeline of periods that can play, or the org unit tree */
export type SelectorControl = 'drop-down' | 'timeline' | 'tree'

/* The controls a selector of each dimension offers, its default first */
export const SELECTOR_CONTROLS: Record<LinkDimension, SelectorControl[]> = {
    pe: ['drop-down', 'timeline'],
    ou: ['drop-down', 'tree'],
    dx: ['drop-down'],
}

/* Below the view's header, with 4px of padding above and below
 * (selector-panel CSS). A drop-down is its label over its select; a
 * timeline its label and period over its buttons and track. A tree has no
 * height of its own: it takes a share of its column, as a plugin does,
 * and scrolls within it. */
export const CONTROL_BODY_SIZES: Record<SelectorControl, ViewSizes> = {
    'drop-down': {
        min: { width: 240, height: 61 },
        preferred: { width: 320, height: 61 },
    },
    timeline: {
        min: { width: 320, height: 63 },
        preferred: { width: 340, height: 63 },
    },
    tree: {
        min: { width: 240, height: 160 },
        preferred: { width: 300 },
    },
}
