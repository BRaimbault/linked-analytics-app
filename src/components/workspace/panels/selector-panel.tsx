import { channelColorStyle } from '@components/interactions/channel-colors'
import {
    getChannelName,
    getChannelValueText,
} from '@components/interactions/channel-names'
import i18n from '@dhis2/d2-i18n'
import { SingleSelectField, SingleSelectOption } from '@dhis2/ui'
import { useAppDispatch, useAppSelector } from '@hooks'
import type { LinkItem } from '@modules/interactions/apply-links'
import { findSelectorChannel } from '@modules/interactions/channels'
import { selectChannels, selectorValueChanged } from '@store/interactions-slice'
import type { FC } from 'react'
import classes from './styles/selector-panel.module.css'

/* A selector's body: a short list of items for its channel's value, with
 * the channel's color down its side. A value set by a click can be outside
 * the list (a chiefdom, a month), so it is listed too. Several items (from
 * Ctrl-clicks) show as the placeholder, as the select holds one. */
export const SelectorPanel: FC<{ viewId: string; items: LinkItem[] }> = ({
    viewId,
    items,
}) => {
    const dispatch = useAppDispatch()
    const channel = useAppSelector((state) =>
        findSelectorChannel(selectChannels(state), viewId)
    )
    if (!channel) {
        return null
    }

    const { value } = channel
    const options = [
        ...items,
        ...value.filter((item) => !items.some(({ id }) => id === item.id)),
    ]

    return (
        <div
            className={classes.selector}
            style={channelColorStyle(channel.label)}
            data-view-id={viewId}
            data-test="selector-view"
        >
            <SingleSelectField
                dense
                clearable
                clearText={i18n.t('Clear')}
                label={getChannelName(channel)}
                placeholder={
                    value.length > 1
                        ? getChannelValueText(channel)
                        : i18n.t('Each view shows its own')
                }
                selected={value.length === 1 ? value[0].id : ''}
                dataTest={`selector-${viewId}`}
                onChange={({ selected }) =>
                    dispatch(
                        selectorValueChanged({
                            viewId,
                            value: options.filter(({ id }) => id === selected),
                        })
                    )
                }
            >
                {options.map(({ id, name }) => (
                    <SingleSelectOption
                        key={id}
                        value={id}
                        label={name ?? id}
                    />
                ))}
            </SingleSelectField>
        </div>
    )
}
