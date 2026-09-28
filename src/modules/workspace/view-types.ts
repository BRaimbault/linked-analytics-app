import i18n from '@dhis2/d2-i18n'
import { PLUGIN_SIZES, VIEW_HEADER_HEIGHT, type ViewSizes } from './grid-tree'

/* Plugins embed an analytics app in an iframe, which is heavy, so their
 * number is capped. Selectors are light pickers that drive the plugins.
 * Text views hold notes, edited in place. */
export type ViewKind = 'plugin' | 'selector' | 'text'

type BaseDefinition = {
    label: () => string
    title: (number: number) => string
    sizes: ViewSizes
}

/* Why no more selectors of a type fit: one more than the plugins, or the
 * hard cap (see view-limits) */
export type SelectorLimit = 'per-plugin' | 'max'

/* A selector type carries its own limit sentences: translators need whole
 * sentences, not a label lowercased into one */
type ViewTypeDefinition =
    | (BaseDefinition & { kind: 'plugin' | 'text' })
    | (BaseDefinition & {
          kind: 'selector'
          limitMessages: Record<SelectorLimit, (max: number) => string>
      })

/* The header, over a one-line summary at least, or a line of controls */
const SELECTOR_SIZES: ViewSizes = {
    min: { width: 240, height: VIEW_HEADER_HEIGHT + 61 },
    preferred: { width: 320, height: VIEW_HEADER_HEIGHT + 85 },
}

/* At least the header over one 20px line of text, with 8px of padding
 * above and below (text-view CSS) */
const TEXT_SIZES: ViewSizes = {
    min: { width: 240, height: VIEW_HEADER_HEIGHT + 36 },
    preferred: { width: 320, height: VIEW_HEADER_HEIGHT + 85 },
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
        title: (number) => i18n.t('Period {{number}}', { number }),
        limitMessages: {
            'per-plugin': () =>
                i18n.t(
                    'A workspace holds at most one more period selector than it has maps and visualizations'
                ),
            max: (max) =>
                i18n.t('A workspace holds up to {{max}} period selectors', {
                    max,
                }),
        },
        sizes: SELECTOR_SIZES,
    },
    'org-unit-selector': {
        kind: 'selector',
        label: () => i18n.t('Org unit'),
        title: (number) => i18n.t('Org unit {{number}}', { number }),
        limitMessages: {
            'per-plugin': () =>
                i18n.t(
                    'A workspace holds at most one more org unit selector than it has maps and visualizations'
                ),
            max: (max) =>
                i18n.t('A workspace holds up to {{max}} org unit selectors', {
                    max,
                }),
        },
        sizes: SELECTOR_SIZES,
    },
    'data-selector': {
        kind: 'selector',
        label: () => i18n.t('Data'),
        title: (number) => i18n.t('Data {{number}}', { number }),
        limitMessages: {
            'per-plugin': () =>
                i18n.t(
                    'A workspace holds at most one more data selector than it has maps and visualizations'
                ),
            max: (max) =>
                i18n.t('A workspace holds up to {{max}} data selectors', {
                    max,
                }),
        },
        sizes: SELECTOR_SIZES,
    },
    text: {
        kind: 'text',
        label: () => i18n.t('Text'),
        title: (number) => i18n.t('Text {{number}}', { number }),
        sizes: TEXT_SIZES,
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

/* Why no more views of a selector type fit; null for a plugin type */
export const getSelectorLimitMessage = (
    type: ViewType,
    limit: SelectorLimit,
    max: number
): string | null => {
    const definition = getDefinition(type)
    return definition.kind === 'selector'
        ? definition.limitMessages[limit](max)
        : null
}

export const PLUGIN_VIEW_TYPES = [
    'map',
    'visualization',
] as const satisfies readonly ViewType[]
