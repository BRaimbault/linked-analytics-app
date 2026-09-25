import i18n from '@dhis2/d2-i18n'

export const VIEW_TYPES = ['map', 'visualization'] as const

export type ViewType = (typeof VIEW_TYPES)[number]

export const isViewType = (value: unknown): value is ViewType =>
    typeof value === 'string' &&
    (VIEW_TYPES as readonly string[]).includes(value)

export const getViewTypeLabel = (type: ViewType): string =>
    type === 'map' ? i18n.t('Map') : i18n.t('Visualization')

export const getViewTitle = (type: ViewType, number: number): string =>
    type === 'map'
        ? i18n.t('Map {{number}}', { number })
        : i18n.t('Visualization {{number}}', { number })
