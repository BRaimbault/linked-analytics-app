import i18n from '@dhis2/d2-i18n'
import {
    Checkbox,
    SingleSelectField,
    SingleSelectOption,
    Tooltip,
} from '@dhis2/ui'
import { useAppDispatch, useAppSelector } from '@hooks'
import {
    DEFAULT_ORG_UNIT_DEPTH,
    type OrgUnitDepth,
} from '@modules/interactions/apply-links'
import {
    LINK_DIMENSIONS,
    SELECTOR_DIMENSIONS,
    type LinkDimension,
} from '@modules/interactions/channels'
import { canSend, type ChannelChoice } from '@modules/interactions/membership'
import {
    isPluginViewType,
    type PluginViewType,
    type ViewType,
} from '@modules/workspace/view-types'
import {
    orgUnitDepthChanged,
    selectChannels,
    selectorChannelChanged,
    viewChannelChanged,
    viewRolesChanged,
} from '@store/interactions-slice'
import type { FC, ReactElement } from 'react'
import { getChannelOptionLabel, getDimensionName } from './channel-names'
import classes from './styles/links-section.module.css'

/* Option values beside the channels' letters, which are single letters */
const NEW = 'new'
const NONE = 'none'

const toChoice = (selected: string): ChannelChoice =>
    selected === NEW || selected === NONE ? selected : { label: selected }

/* Named as in the org unit picker. In a filter, a view shows the selected
 * org unit whatever this says: its sub-units add up to the same. */
const ORG_UNIT_DEPTHS: { depth: OrgUnitDepth; label: () => string }[] = [
    { depth: 0, label: () => i18n.t('Selected org unit') },
    { depth: 1, label: () => i18n.t('Sub-units') },
    { depth: 2, label: () => i18n.t('Sub-x2-units') },
]

/* Why a view type's clicks can't set a dimension (see canSend) */
const NOT_SENT_REASONS: Partial<Record<string, () => string>> = {
    'map-pe': () => i18n.t('A click on a map carries no period.'),
}

/* A control that can't change says why in a tooltip. A disabled checkbox
 * can't take focus, so the tooltip's own focusable wrapper lets the
 * keyboard reach the reason. */
const WithReason: FC<{ reason: string | null; children: ReactElement }> = ({
    reason,
    children,
}) => (reason ? <Tooltip content={reason}>{children}</Tooltip> : children)

const useDimensionChannels = (dimension: LinkDimension) =>
    useAppSelector(selectChannels).filter(
        (channel) => channel.dimension === dimension
    )

/* A map's or visualization's link for one dimension: which channel, and
 * whether it sends its clicks and follows the value */
const ViewLinkRow: FC<{
    viewId: string
    type: PluginViewType
    dimension: LinkDimension
}> = ({ viewId, type, dimension }) => {
    const dispatch = useAppDispatch()
    const channels = useDimensionChannels(dimension)
    const current = channels.find((channel) =>
        Object.hasOwn(channel.members, viewId)
    )
    const member = current?.members[viewId]
    const notSentReason = canSend(type, dimension)
        ? null
        : (NOT_SENT_REASONS[`${type}-${dimension}`] as () => string)()
    const link = { viewId, dimension }

    return (
        <div
            className={classes.row}
            data-test={`links-${dimension}`}
            role="group"
            aria-label={getDimensionName(dimension)}
        >
            <SingleSelectField
                dense
                label={getDimensionName(dimension)}
                prefix={i18n.t('Channel')}
                selected={current?.label ?? NONE}
                dataTest={`links-${dimension}-channel`}
                onChange={({ selected }) =>
                    dispatch(
                        viewChannelChanged({
                            ...link,
                            choice: toChoice(selected),
                        })
                    )
                }
            >
                {channels.map((channel) => (
                    <SingleSelectOption
                        key={channel.label}
                        value={channel.label}
                        label={getChannelOptionLabel(channel)}
                    />
                ))}
                <SingleSelectOption value={NEW} label={i18n.t('New channel')} />
                <SingleSelectOption value={NONE} label={i18n.t('None')} />
            </SingleSelectField>
            {dimension === 'ou' && member?.receive && (
                <SingleSelectField
                    dense
                    label={i18n.t('Org units on an axis')}
                    prefix={i18n.t('Show')}
                    selected={String(member.depth ?? DEFAULT_ORG_UNIT_DEPTH)}
                    dataTest="links-ou-depth"
                    onChange={({ selected }) =>
                        dispatch(
                            orgUnitDepthChanged({
                                viewId,
                                depth: Number(selected) as OrgUnitDepth,
                            })
                        )
                    }
                >
                    {ORG_UNIT_DEPTHS.map(({ depth, label }) => (
                        <SingleSelectOption
                            key={depth}
                            value={String(depth)}
                            label={label()}
                        />
                    ))}
                </SingleSelectField>
            )}
            {member && (
                <div className={classes.roles}>
                    <WithReason reason={notSentReason}>
                        <Checkbox
                            dense
                            label={i18n.t('Set the value by clicking')}
                            checked={member.send}
                            disabled={notSentReason !== null}
                            dataTest={`links-${dimension}-send`}
                            onChange={({ checked }) =>
                                dispatch(
                                    viewRolesChanged({
                                        ...link,
                                        roles: { ...member, send: checked },
                                    })
                                )
                            }
                        />
                    </WithReason>
                    <Checkbox
                        dense
                        label={i18n.t('Follow the value')}
                        checked={member.receive}
                        dataTest={`links-${dimension}-receive`}
                        onChange={({ checked }) =>
                            dispatch(
                                viewRolesChanged({
                                    ...link,
                                    roles: { ...member, receive: checked },
                                })
                            )
                        }
                    />
                </div>
            )}
        </div>
    )
}

/* A selector's channel: one without a selector, or a new one */
const SelectorLinkRow: FC<{ viewId: string; dimension: LinkDimension }> = ({
    viewId,
    dimension,
}) => {
    const dispatch = useAppDispatch()
    const channels = useDimensionChannels(dimension).filter(
        ({ selectorViewId }) =>
            selectorViewId === null || selectorViewId === viewId
    )
    const current = channels.find(
        ({ selectorViewId }) => selectorViewId === viewId
    )

    return (
        <div className={classes.row} data-test="links-selector">
            <SingleSelectField
                dense
                label={getDimensionName(dimension)}
                prefix={i18n.t('Channel')}
                selected={current?.label}
                dataTest="links-selector-channel"
                onChange={({ selected }) =>
                    dispatch(
                        selectorChannelChanged({
                            viewId,
                            choice:
                                selected === NEW ? NEW : { label: selected },
                        })
                    )
                }
            >
                {channels.map((channel) => (
                    <SingleSelectOption
                        key={channel.label}
                        value={channel.label}
                        label={getChannelOptionLabel(channel)}
                    />
                ))}
                <SingleSelectOption value={NEW} label={i18n.t('New channel')} />
            </SingleSelectField>
            {/* Shown to compare with a view's roles: a selector always
             * has both */}
            <div className={classes.roles}>
                <WithReason
                    reason={i18n.t(
                        'A selector always sets the value of its channel.'
                    )}
                >
                    <Checkbox
                        dense
                        label={i18n.t('Set the value by picking')}
                        checked
                        disabled
                        dataTest="links-selector-send"
                    />
                </WithReason>
                <WithReason
                    reason={i18n.t(
                        'A selector always shows the value of its channel.'
                    )}
                >
                    <Checkbox
                        dense
                        label={i18n.t('Follow the value')}
                        checked
                        disabled
                        dataTest="links-selector-receive"
                    />
                </WithReason>
            </div>
        </div>
    )
}

/* How a view is linked to the others, in its settings tab
 * (docs/interactions.md §5.4). Changes apply at once. */
export const LinksSection: FC<{ viewId: string; type: ViewType }> = ({
    viewId,
    type,
}) => {
    const selectorDimension = SELECTOR_DIMENSIONS[type]
    return (
        <section
            className={classes.links}
            aria-labelledby={`links-heading-${viewId}`}
            data-test="links-section"
        >
            <h2 id={`links-heading-${viewId}`} className={classes.heading}>
                {i18n.t('Links')}
            </h2>
            {isPluginViewType(type)
                ? LINK_DIMENSIONS.map((dimension) => (
                      <ViewLinkRow
                          key={dimension}
                          viewId={viewId}
                          type={type}
                          dimension={dimension}
                      />
                  ))
                : selectorDimension && (
                      <SelectorLinkRow
                          viewId={viewId}
                          dimension={selectorDimension}
                      />
                  )}
        </section>
    )
}
