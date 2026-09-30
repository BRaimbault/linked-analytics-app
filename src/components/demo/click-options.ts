import type { DataClickOptions } from '@modules/plugins/contract'
import type { MouseEvent } from 'react'

/* How a fake reports a click on a point, as the proposed contract asks: a
 * plain click, additive with Ctrl or Cmd; or a right-click, with where it
 * happened from the plugin's top-left corner (its root fills the view's
 * body, as an iframe would), and without the browser's own menu */
export const toClickOptions = (
    event: MouseEvent,
    root: HTMLElement
): DataClickOptions => {
    if (event.type !== 'contextmenu') {
        return { additive: event.ctrlKey || event.metaKey }
    }
    event.preventDefault()
    const { left, top } = root.getBoundingClientRect()
    return {
        additive: false,
        trigger: 'context',
        position: { x: event.clientX - left, y: event.clientY - top },
    }
}
