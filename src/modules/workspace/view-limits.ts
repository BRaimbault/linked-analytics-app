import i18n from '@dhis2/d2-i18n'
import {
    getSelectorLimitMessage,
    getViewKind,
    type SelectorLimit,
    type ViewKind,
    type ViewType,
} from './view-types'

/* Each plugin loads a whole app in an iframe, so their number is capped.
 * Selectors are light, but each drives plugins, so a workspace holds at most
 * one more selector of a type than it has plugins, and never more than
 * MAX_SELECTORS_PER_TYPE. */
export const MAX_PLUGIN_VIEWS = 4

export const MAX_SELECTORS_PER_TYPE = 4

type Views = ReadonlyArray<{ type: ViewType }>

const countPlugins = (views: Views): number =>
    views.filter((view) => getViewKind(view.type) === 'plugin').length

/* Which selector limit is reached, if any */
const getReachedSelectorLimit = (
    type: ViewType,
    views: Views
): SelectorLimit | null => {
    const sameType = views.filter((view) => view.type === type).length
    if (sameType >= MAX_SELECTORS_PER_TYPE) {
        return 'max'
    }
    return sameType > countPlugins(views) ? 'per-plugin' : null
}

/* Text views have no cap: the room left in the grid limits them */
const LIMITS: Record<ViewKind, (type: ViewType, views: Views) => boolean> = {
    plugin: (_, views) => countPlugins(views) < MAX_PLUGIN_VIEWS,
    selector: (type, views) => getReachedSelectorLimit(type, views) === null,
    text: () => true,
}

export const canAddView = (type: ViewType, views: Views): boolean =>
    LIMITS[getViewKind(type)](type, views)

/* Why a view of this type can't be added to these views */
export const getViewLimitMessage = (type: ViewType, views: Views): string =>
    getSelectorLimitMessage(
        type,
        getReachedSelectorLimit(type, views) ?? 'per-plugin',
        MAX_SELECTORS_PER_TYPE
    ) ??
    i18n.t('A workspace holds up to {{max}} maps and visualizations', {
        max: MAX_PLUGIN_VIEWS,
    })

/* Numbers freed by closing a view are reused, so titles stay short */
export const getNextViewNumber = (
    type: ViewType,
    views: ReadonlyArray<{ type: ViewType; number: number }>
): number => {
    const taken = new Set(
        views.filter((view) => view.type === type).map((view) => view.number)
    )
    let number = 1
    while (taken.has(number)) {
        number++
    }
    return number
}
