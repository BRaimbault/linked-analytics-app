import {
    ActionsMenu,
    type MenuAction,
} from '@components/workspace/tabs/actions-menu'
import i18n from '@dhis2/d2-i18n'
import { Tooltip } from '@dhis2/ui'
import { useAppDispatch, useAppSelector } from '@hooks'
import type { Channel } from '@modules/interactions/channels'
import {
    channelValueCleared,
    selectChannels,
    viewChannelChanged,
} from '@store/interactions-slice'
import type { FC, MutableRefObject, ReactNode } from 'react'
import { channelColorStyle } from './channel-colors'
import { getChannelName, getChannelValueText } from './channel-names'
import classes from './styles/channel-badges.module.css'

const getRoleText = (channel: Channel, viewId: string): string => {
    if (channel.selectorViewId === viewId) {
        return i18n.t('Sets the value')
    }
    const { send, receive } = channel.members[viewId]
    if (send && receive) {
        return i18n.t('Sets the value by clicking, and follows it')
    }
    return send
        ? i18n.t('Sets the value by clicking')
        : i18n.t('Follows the value')
}

/* What a view can do with a channel from its badge: clear the value, which
 * a closed selector would otherwise leave in place, and leave the channel,
 * as a member (a selector stays with its own channel) */
const useBadgeActions = (channel: Channel, viewId: string): MenuAction[] => {
    const dispatch = useAppDispatch()
    const { label, dimension } = channel
    return [
        ...(channel.value.length
            ? [
                  {
                      key: 'clear',
                      label: i18n.t('Clear the value'),
                      dataTest: `channel-badge-${label}-clear`,
                      onClick: () => dispatch(channelValueCleared({ label })),
                  },
              ]
            : []),
        ...(channel.selectorViewId === viewId
            ? []
            : [
                  {
                      key: 'leave',
                      label: i18n.t('Leave the channel'),
                      dataTest: `channel-badge-${label}-leave`,
                      onClick: () =>
                          dispatch(
                              viewChannelChanged({
                                  viewId,
                                  dimension,
                                  choice: 'none',
                              })
                          ),
                  },
              ]),
    ]
}

/* A channel's letter on its color (never the color alone), with → when
 * the view sends to it and ← when it follows it. With actions, it is a
 * button that opens them. */
const ChannelBadge: FC<{ channel: Channel; viewId: string }> = ({
    channel,
    viewId,
}) => {
    const member = channel.members[viewId]
    const name = getChannelName(channel)
    const value = getChannelValueText(channel)
    const role = getRoleText(channel, viewId)
    const actions = useBadgeActions(channel, viewId)
    const badgeProps = {
        className: classes.badge,
        style: channelColorStyle(channel.label),
        'aria-label': `${name}. ${value}. ${role}`,
        'data-test': `channel-badge-${channel.label}`,
    }
    const letters = (
        <span aria-hidden>
            {channel.label}
            {member?.send && '→'}
            {member?.receive && '←'}
        </span>
    )
    const withTooltip = (
        badge: (props: { ref: unknown } & object) => ReactNode
    ) => (
        <Tooltip
            content={
                <>
                    <strong>{name}</strong> {value}
                    <br />
                    {role}
                </>
            }
        >
            {badge}
        </Tooltip>
    )

    if (!actions.length) {
        return withTooltip(({ ref, ...handlers }) => (
            <span
                {...handlers}
                {...badgeProps}
                ref={ref as MutableRefObject<HTMLSpanElement>}
                role="img"
                tabIndex={0}
            >
                {letters}
            </span>
        ))
    }
    return (
        <ActionsMenu
            label={name}
            dataTest={badgeProps['data-test']}
            actions={actions}
            renderButton={(toggle) =>
                withTooltip(({ ref, ...handlers }) => (
                    <button
                        {...handlers}
                        {...badgeProps}
                        ref={ref as MutableRefObject<HTMLButtonElement>}
                        type="button"
                        aria-haspopup="menu"
                        onClick={toggle}
                    >
                        {letters}
                    </button>
                ))
            }
        />
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
