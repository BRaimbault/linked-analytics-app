import {
    getViewObject,
    onViewParamsChange,
    setViewObject,
} from '@components/workspace/controller/views'
import { useDockviewValue } from '@components/workspace/use-dockview-value'
import i18n from '@dhis2/d2-i18n'
import { SingleSelectField, SingleSelectOption } from '@dhis2/ui'
import type { PluginObject } from '@modules/plugins/contract'
import type { DockviewApi } from 'dockview-react'
import { useCallback, type FC } from 'react'

/* Picks the saved item a plugin view shows, among those its source
 * offers, and shows the one it has */
export const SavedItemPicker: FC<{
    api: DockviewApi
    viewId: string
    items: PluginObject[]
}> = ({ api, viewId, items }) => {
    const selectedId = useDockviewValue(
        useCallback(() => getViewObject(api, viewId)?.id, [api, viewId]),
        useCallback(
            (listener) => onViewParamsChange(api, viewId, listener),
            [api, viewId]
        )
    )

    return (
        <SingleSelectField
            dense
            label={i18n.t('Saved item')}
            placeholder={i18n.t('Choose a saved item')}
            selected={selectedId}
            dataTest={`saved-item-${viewId}`}
            onChange={({ selected }) =>
                setViewObject(
                    api,
                    viewId,
                    items.find(({ id }) => id === selected) as PluginObject
                )
            }
        >
            {items.map((item) => (
                <SingleSelectOption
                    key={item.id}
                    value={item.id as string}
                    label={item.name}
                />
            ))}
        </SingleSelectField>
    )
}
