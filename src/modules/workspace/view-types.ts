import i18n from '@dhis2/d2-i18n'
import { PLUGIN_SIZES, type ViewSizes } from './grid-tree'

/* Plugins embed an analytics app in an iframe, which is heavy, so their
 * number is capped. Selectors are light pickers that drive the plugins. */
export type ViewKind = 'plugin' | 'selector'

type ViewTypeDefinition = {
    kind: ViewKind
    label: () => string
    title: (number: number) => string
    sizes: ViewSizes
}

/* Header (about 30px) plus a one-line summary */
const SELECTOR_SIZES: ViewSizes = {
    min: { width: 240, height: 96 },
    preferred: { width: 320, height: 120 },
    max: { width: 640, height: 240 },
}

const VIEW_TYPE_DEFINITIONS = {
    map: {
        kind: 'plugin',
        label: () => i18n.t('Map'),
        title: (number) => i18n.t('Map {{number}}', { number }),
        sizes: PLUGIN_SIZES,
    },
    visualization: {
        kind: 'plugin',
        label: () => i18n.t('Visualization'),
        title: (number) => i18n.t('Visualization {{number}}', { number }),
        sizes: PLUGIN_SIZES,
    },
    'period-selector': {
        kind: 'selector',
        label: () => i18n.t('Period'),
        title: (number) => i18n.t('Period selector {{number}}', { number }),
        sizes: SELECTOR_SIZES,
    },
    'org-unit-selector': {
        kind: 'selector',
        label: () => i18n.t('Org unit'),
        title: (number) => i18n.t('Org unit selector {{number}}', { number }),
        sizes: SELECTOR_SIZES,
    },
    'data-selector': {
        kind: 'selector',
        label: () => i18n.t('Data'),
        title: (number) => i18n.t('Data selector {{number}}', { number }),
        sizes: SELECTOR_SIZES,
    },
} satisfies Record<string, ViewTypeDefinition>

export type ViewType = keyof typeof VIEW_TYPE_DEFINITIONS

export const VIEW_TYPES = Object.keys(VIEW_TYPE_DEFINITIONS) as ViewType[]

export const isViewType = (value: unknown): value is ViewType =>
    typeof value === 'string' && Object.hasOwn(VIEW_TYPE_DEFINITIONS, value)

const getDefinition = (type: ViewType): ViewTypeDefinition =>
    VIEW_TYPE_DEFINITIONS[type]

export const getViewKind = (type: ViewType): ViewKind =>
    getDefinition(type).kind

export const getViewTypeLabel = (type: ViewType): string =>
    getDefinition(type).label()

export const getViewTitle = (type: ViewType, number: number): string =>
    getDefinition(type).title(number)

export const getViewTypeSizes = (type: ViewType): ViewSizes =>
    getDefinition(type).sizes

export const PLUGIN_VIEW_TYPES = [
    'map',
    'visualization',
] as const satisfies readonly ViewType[]
