import {
    getViewControl,
    onViewParamsChange,
    setViewControl,
} from '@components/workspace/controller/views'
import { useDockviewValue } from '@components/workspace/use-dockview-value'
import i18n from '@dhis2/d2-i18n'
import { SingleSelectField, SingleSelectOption } from '@dhis2/ui'
import type { LinkDimension } from '@modules/interactions/channels'
import {
    SELECTOR_CONTROLS,
    type SelectorControl,
} from '@modules/selectors/controls'
import type { DockviewApi } from 'dockview-react'
import { useCallback, type FC } from 'react'

const CONTROL_LABELS: Record<SelectorControl, () => string> = {
    'drop-down': () => i18n.t('Drop-down'),
    timeline: () => i18n.t('Timeline'),
    tree: () => i18n.t('Tree'),
}

/* How a selector shows its values, among the controls of its dimension;
 * none to choose for a dimension with one */
export const SelectorControlField: FC<{
    api: DockviewApi
    viewId: string
    dimension: LinkDimension
}> = ({ api, viewId, dimension }) => {
    const controls = SELECTOR_CONTROLS[dimension]
    const control = useDockviewValue(
        useCallback(() => getViewControl(api, viewId), [api, viewId]),
        useCallback(
            (listener) => onViewParamsChange(api, viewId, listener),
            [api, viewId]
        )
    )
    if (controls.length < 2) {
        return null
    }

    return (
        <SingleSelectField
            dense
            label={i18n.t('Control')}
            selected={control ?? controls[0]}
            dataTest={`selector-control-${viewId}`}
            onChange={({ selected }) =>
                setViewControl(api, viewId, selected as SelectorControl)
            }
        >
            {controls.map((option) => (
                <SingleSelectOption
                    key={option}
                    value={option}
                    label={CONTROL_LABELS[option]()}
                />
            ))}
        </SingleSelectField>
    )
}
