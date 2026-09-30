import i18n from '@dhis2/d2-i18n'
import type { Channel, LinkDimension } from '@modules/interactions/channels'

const DIMENSION_NAMES: Record<LinkDimension, () => string> = {
    ou: () => i18n.t('Org unit'),
    pe: () => i18n.t('Period'),
    dx: () => i18n.t('Data'),
}

export const getDimensionName = (dimension: LinkDimension): string =>
    DIMENSION_NAMES[dimension]()

/* "Org unit A" */
export const getChannelName = ({ dimension, label }: Channel): string =>
    i18n.t('{{dimension}} {{label}}', {
        dimension: getDimensionName(dimension),
        label,
        interpolation: { escapeValue: false },
    })

export const getChannelValueText = ({ value }: Channel): string =>
    value.length
        ? value.map(({ id, name }) => name ?? id).join(', ')
        : i18n.t('Nothing selected')

/* "A · North", to pick a channel by what it holds, in a field that
 * already names the dimension */
export const getChannelOptionLabel = (channel: Channel): string =>
    i18n.t('{{label}} · {{value}}', {
        label: channel.label,
        value: getChannelValueText(channel),
        interpolation: { escapeValue: false },
    })
