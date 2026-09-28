import type { DockviewApi, IDockviewPanel } from 'dockview-react'
import { withoutSizing } from './grid-layout'
import { SWAP_SPACER_COMPONENT } from './panels'
import { showViewSettings } from './settings'

/* Swaps two views by moving the panels themselves, so their content (and
 * later a plugin's iframe) is never rebuilt. dockview removes a group the
 * moment it is empty, so each cell holds a temporary spacer tab while its
 * view is away. The first view's settings come forward, without a dockview
 * event to say so: returns that view, for the caller to select (a view is
 * selected while its settings are shown), or null. */
export const swapViews = (
    api: DockviewApi,
    first: IDockviewPanel,
    second: IDockviewPanel
): string | null => {
    const firstGroup = first.group
    const secondGroup = second.group
    if (firstGroup === secondGroup) {
        return null
    }
    /* A swap leaves every size as it was */
    withoutSizing(api, () => {
        const spacers = [firstGroup, secondGroup].map((group, index) =>
            api.addPanel({
                id: `swap-spacer-${index}-${crypto.randomUUID()}`,
                component: SWAP_SPACER_COMPONENT,
                position: { referenceGroup: group },
                inactive: true,
            })
        )
        first.api.moveTo({ group: secondGroup })
        second.api.moveTo({ group: firstGroup })
        spacers.forEach((spacer) => api.removePanel(spacer))
    })
    first.api.setActive()
    return showViewSettings(api, first.id) ? first.id : null
}

/* For callers that only know the ids (e.g. from the store); does nothing
 * if either view is gone by then */
export const swapViewsById = (
    api: DockviewApi,
    firstId: string,
    secondId: string
): string | null => {
    const first = api.getPanel(firstId)
    const second = api.getPanel(secondId)
    return first && second ? swapViews(api, first, second) : null
}
