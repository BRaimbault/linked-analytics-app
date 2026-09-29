import i18n from '@dhis2/d2-i18n'
import type { Channel, LinkDimension } from '@modules/interactions/channels'

const DIMENSION_NAMES: Record<LinkDimension, () => string> = {
    ou: () => i18n.t('Org unit'),
    pe: () => i18n.t('Period'),
}

/* "Org unit A" */
export const getChannelName = ({ dimension, label }: Channel): string =>
    i18n.t('{{dimension}} {{label}}', {
        dimension: DIMENSION_NAMES[dimension](),
        label,
        interpolation: { escapeValue: false },
    })

export const getChannelValueText = ({ value }: Channel): string =>
    value.length
        ? value.map(({ id, name }) => name ?? id).join(', ')
        : i18n.t('Nothing selected')
