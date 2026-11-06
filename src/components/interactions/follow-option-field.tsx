import { usePluginSources } from '@components/plugins/plugin-sources'
import i18n from '@dhis2/d2-i18n'
import { SingleSelectField, SingleSelectOption } from '@dhis2/ui'
import { useAppDispatch } from '@hooks'
import {
    DEFAULT_ORG_UNIT_DEPTH,
    type OrgUnitDepth,
} from '@modules/interactions/apply-links'
import type {
    ChannelMember,
    LinkDimension,
} from '@modules/interactions/channels'
import type { PluginViewType } from '@modules/workspace/view-types'
import {
    highlightOnlyChanged,
    orgUnitDepthChanged,
} from '@store/interactions-slice'
import type { FC } from 'react'

const HIGHLIGHT_ONLY = 'highlight'

/* Named as in the org unit picker. In a filter, a view shows the selected
 * org unit whatever this says: its sub-units add up to the same. */
const ORG_UNIT_OPTIONS = [
    { value: '0', label: () => i18n.t('Selected org unit') },
    { value: '1', label: () => i18n.t('Sub-units') },
    { value: '2', label: () => i18n.t('Sub-x2-units') },
]

const PERIOD_OPTIONS = [{ value: 'picked', label: () => i18n.t('As picked') }]

const HIGHLIGHT_OPTION = {
    value: HIGHLIGHT_ONLY,
    label: () => i18n.t('Highlight only'),
}

/* How a view follows its channel's value (docs/interactions.md §5.7): org
 * units at a depth, a period as picked, or either with "Highlight only",
 * which keeps the view's own and marks the value, when its plugin can.
 * None for data, nor for a period with nothing to choose. */
export const FollowOptionField: FC<{
    viewId: string
    type: PluginViewType
    dimension: LinkDimension
    member: ChannelMember
}> = ({ viewId, type, dimension, member }) => {
    const dispatch = useAppDispatch()
    const canHighlight = usePluginSources().canHighlight[type] === true
    const ownOptions = dimension === 'ou' ? ORG_UNIT_OPTIONS : PERIOD_OPTIONS
    const options = canHighlight
        ? [...ownOptions, HIGHLIGHT_OPTION]
        : ownOptions
    if (dimension === 'dx' || options.length < 2) {
        return null
    }
    const ownValue =
        dimension === 'ou'
            ? String(member.depth ?? DEFAULT_ORG_UNIT_DEPTH)
            : PERIOD_OPTIONS[0].value
    const link = { viewId, dimension }

    return (
        <SingleSelectField
            dense
            label={i18n.t('When it follows')}
            prefix={i18n.t('Show')}
            selected={member.highlightOnly ? HIGHLIGHT_ONLY : ownValue}
            dataTest={`links-${dimension}-follow`}
            onChange={({ selected }) => {
                const highlightOnly = selected === HIGHLIGHT_ONLY
                dispatch(highlightOnlyChanged({ ...link, highlightOnly }))
                if (!highlightOnly && dimension === 'ou') {
                    dispatch(
                        orgUnitDepthChanged({
                            viewId,
                            depth: Number(selected) as OrgUnitDepth,
                        })
                    )
                }
            }}
        >
            {options.map(({ value, label }) => (
                <SingleSelectOption key={value} value={value} label={label()} />
            ))}
        </SingleSelectField>
    )
}
