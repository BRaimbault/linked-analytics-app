import i18n from '@dhis2/d2-i18n'
import { Tooltip } from '@dhis2/ui'
import { useAppSelector } from '@hooks'
import type { Channel } from '@modules/interactions/channels'
import { selectChannels } from '@store/interactions-slice'
import type { FC, MutableRefObject } from 'react'
import { channelColorStyle } from './channel-colors'
import { getChannelName, getChannelValueText } from './channel-names'
import classes from './styles/channel-badges.module.css'

/* Views join channels both ways until link mode can change that */
const getRoleText = (channel: Channel, viewId: string): string =>
    channel.selectorViewId === viewId
        ? i18n.t('Sets the value')
        : i18n.t('Sends clicks and follows the value')

/* A channel's letter on its color (never the color alone), with → when
 * the view sends to it and ← when it follows it */
const ChannelBadge: FC<{ channel: Channel; viewId: string }> = ({
    channel,
    viewId,
}) => {
    const member = channel.members[viewId]
    const name = getChannelName(channel)
    const value = getChannelValueText(channel)
    const role = getRoleText(channel, viewId)

    return (
        <Tooltip
            content={
                <>
                    <strong>{name}</strong> {value}
                    <br />
                    {role}
                </>
            }
        >
            {({ ref, ...handlers }) => (
                <span
                    {...handlers}
                    ref={ref as MutableRefObject<HTMLSpanElement>}
                    className={classes.badge}
                    style={channelColorStyle(channel.label)}
                    role="img"
                    aria-label={`${name}. ${value}. ${role}`}
                    tabIndex={0}
                    data-test={`channel-badge-${channel.label}`}
                >
                    <span aria-hidden>
                        {channel.label}
                        {member?.send && '→'}
                        {member?.receive && '←'}
                    </span>
                </span>
            )}
        </Tooltip>
    )
}

/* The channels a view belongs to, or drives as their selector */
export const ChannelBadges: FC<{ viewId: string }> = ({ viewId }) => {
    const channels = useAppSelector(selectChannels).filter(
        (channel) =>
            channel.selectorViewId === viewId ||
            Object.hasOwn(channel.members, viewId)
    )
    if (!channels.length) {
        return null
    }
    return (
        <span className={classes.badges} data-test="channel-badges">
            {channels.map((channel) => (
                <ChannelBadge
                    key={channel.label}
                    channel={channel}
                    viewId={viewId}
                />
            ))}
        </span>
    )
}
