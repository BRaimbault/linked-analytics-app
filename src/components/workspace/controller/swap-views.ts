import type { DockviewApi, IDockviewPanel } from 'dockview-react'
import { SWAP_SPACER_COMPONENT } from './panels'
import { showViewSettings } from './settings'

/* Swaps two views by moving the panels themselves, so their content (and
 * later a plugin's iframe) is never rebuilt. dockview removes a group the
 * moment it is empty, so each cell holds a temporary spacer tab while its
 * view is away. */
export const swapViews = (
    api: DockviewApi,
    first: IDockviewPanel,
    second: IDockviewPanel
): void => {
    const firstGroup = first.group
    const secondGroup = second.group
    if (firstGroup === secondGroup) {
        return
    }
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
    first.api.setActive()
    showViewSettings(api, first.id)
}

/* For callers that only know the ids (e.g. from the store); does nothing
 * if either view is gone by then. */
export const swapViewsById = (
    api: DockviewApi,
    firstId: string,
    secondId: string
): void => {
    const first = api.getPanel(firstId)
    const second = api.getPanel(secondId)
    if (first && second) {
        swapViews(api, first, second)
    }
}

/* Swap spacers are added and removed within one call, so they never paint */
export const SwapSpacer = (): null => null
