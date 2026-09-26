import i18n from '@dhis2/d2-i18n'
import { getViewKind, getViewTypeLabel, type ViewType } from './view-types'

/* Each plugin loads a whole app in an iframe, so their number is capped.
 * Selectors are light, but each drives plugins, so a workspace holds at most
 * one more selector of a type than it has plugins. */
export const MAX_PLUGIN_VIEWS = 4

const countPlugins = (views: ReadonlyArray<{ type: ViewType }>): number =>
    views.filter((view) => getViewKind(view.type) === 'plugin').length

export const canAddView = (
    type: ViewType,
    views: ReadonlyArray<{ type: ViewType }>
): boolean => {
    const plugins = countPlugins(views)
    if (getViewKind(type) === 'plugin') {
        return plugins < MAX_PLUGIN_VIEWS
    }
    const sameType = views.filter((view) => view.type === type).length
    return sameType + 1 <= plugins + 1
}

/* Why a view of this type can't be added */
export const getViewLimitMessage = (type: ViewType): string =>
    getViewKind(type) === 'plugin'
        ? i18n.t('A workspace holds up to {{max}} maps and visualizations', {
              max: MAX_PLUGIN_VIEWS,
          })
        : i18n.t(
              'A workspace holds at most one more {{selector}} selector than it has maps and visualizations',
              { selector: getViewTypeLabel(type).toLowerCase() }
          )

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
