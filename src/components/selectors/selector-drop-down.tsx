import { getChannelValueText } from '@components/interactions/channel-names'
import i18n from '@dhis2/d2-i18n'
import { SingleSelectField, SingleSelectOption } from '@dhis2/ui'
import type { LinkItem } from '@modules/interactions/apply-links'
import type { Channel } from '@modules/interactions/channels'
import type { FC } from 'react'

/* A selector as a short list of items. A value set by a click can be
 * outside the list (a chiefdom, a month), so it is listed too. Several
 * items (from Ctrl-clicks) show as the placeholder, as the select holds
 * one. */
export const SelectorDropDown: FC<{
    viewId: string
    channel: Channel
    label: string
    items: LinkItem[]
    select: (value: LinkItem[]) => void
}> = ({ viewId, channel, label, items, select }) => {
    const { value } = channel
    const options = [
        ...items,
        ...value.filter((item) => !items.some(({ id }) => id === item.id)),
    ]
    return (
        <SingleSelectField
            dense
            clearable
            clearText={i18n.t('Clear')}
            label={label}
            placeholder={
                value.length > 1
                    ? getChannelValueText(channel)
                    : i18n.t('Each view shows its own')
            }
            selected={value.length === 1 ? value[0].id : ''}
            dataTest={`selector-${viewId}`}
            onChange={({ selected }) =>
                select(options.filter(({ id }) => id === selected))
            }
        >
            {options.map(({ id, name }) => (
                <SingleSelectOption key={id} value={id} label={name ?? id} />
            ))}
        </SingleSelectField>
    )
}
