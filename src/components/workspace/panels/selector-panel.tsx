import { channelColorStyle } from '@components/interactions/channel-colors'
import {
    getChannelName,
    getChannelValueText,
} from '@components/interactions/channel-names'
import { usePluginSources } from '@components/plugins/plugin-sources'
import { OrgUnitTree } from '@components/selectors/org-unit-tree'
import { PeriodTimeline } from '@components/selectors/period-timeline'
import { SelectorDropDown } from '@components/selectors/selector-drop-down'
import i18n from '@dhis2/d2-i18n'
import { useAppDispatch, useAppSelector } from '@hooks'
import type { LinkItem } from '@modules/interactions/apply-links'
import {
    findSelectorChannel,
    type Channel,
} from '@modules/interactions/channels'
import type { SelectorControl } from '@modules/selectors/controls'
import { selectChannels, selectorValueChanged } from '@store/interactions-slice'
import { useCallback, useMemo, type FC } from 'react'
import classes from './styles/selector-panel.module.css'

/* A selector's body: its control for its channel's value, with the
 * channel's color down its side */
export const SelectorPanel: FC<{
    viewId: string
    items: LinkItem[]
    control?: SelectorControl
}> = ({ viewId, items, control = 'drop-down' }) => {
    const dispatch = useAppDispatch()
    const channel = useAppSelector((state) =>
        findSelectorChannel(selectChannels(state), viewId)
    )
    const select = useCallback(
        (value: LinkItem[]) =>
            dispatch(selectorValueChanged({ viewId, value })),
        [dispatch, viewId]
    )
    if (!channel) {
        return null
    }

    return (
        <div
            className={classes.selector}
            style={channelColorStyle(channel.label)}
            data-view-id={viewId}
            data-test="selector-view"
        >
            <SelectorControlBody
                viewId={viewId}
                channel={channel}
                items={items}
                control={control}
                select={select}
            />
        </div>
    )
}

/* The control asked for, or the drop-down when its periods or roots are
 * missing */
const SelectorControlBody: FC<{
    viewId: string
    channel: Channel
    items: LinkItem[]
    control: SelectorControl
    select: (value: LinkItem[]) => void
}> = ({ viewId, channel, items, control, select }) => {
    const { timelinePeriods, orgUnitTreeRoots, orgUnitLevelCount } =
        usePluginSources()
    const label = getChannelName(channel)
    const valueText = channel.value.length
        ? getChannelValueText(channel)
        : i18n.t('Each view shows its own')
    const receiverIds = useMemo(
        () =>
            /* A view that only highlights doesn't draw again */
            Object.entries(channel.members).flatMap(
                ([id, { receive, highlightOnly }]) =>
                    receive && !highlightOnly && id !== viewId ? [id] : []
            ),
        [channel.members, viewId]
    )
    const selectOne = useCallback((item: LinkItem) => select([item]), [select])
    const clear = useCallback(() => select([]), [select])

    if (control === 'timeline' && timelinePeriods.length) {
        return (
            <PeriodTimeline
                label={label}
                valueText={valueText}
                periods={timelinePeriods}
                value={channel.value}
                receiverIds={receiverIds}
                onSelect={selectOne}
                onClear={clear}
            />
        )
    }
    if (control === 'tree' && orgUnitTreeRoots.length) {
        return (
            <OrgUnitTree
                label={label}
                valueText={valueText}
                roots={orgUnitTreeRoots}
                deepestLevel={orgUnitLevelCount}
                value={channel.value}
                onChange={select}
            />
        )
    }
    return (
        <SelectorDropDown
            viewId={viewId}
            channel={channel}
            label={label}
            items={items}
            select={select}
        />
    )
}
