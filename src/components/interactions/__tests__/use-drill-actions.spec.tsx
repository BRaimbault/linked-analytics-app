import { useDrillActions } from '@components/interactions/use-drill-actions'
import {
    NO_PLUGIN_SOURCES,
    PluginSourcesProvider,
} from '@components/plugins/plugin-sources'
import { renderWithStore } from '@components/workspace/__tests__/render-with-store'
import type { LinkItem } from '@modules/interactions/apply-links'
import { dataClicked } from '@store/interactions-slice'
import { viewAdded } from '@store/workspace-slice'
import { act, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

const Labels = ({ clicked }: { clicked?: LinkItem }) => (
    <ul>
        {useDrillActions('map-1', clicked).map(({ key, label }) => (
            <li key={key}>{label}</li>
        ))}
    </ul>
)

const sources = { ...NO_PLUGIN_SOURCES, orgUnitLevelCount: 3 }

const labels = () =>
    screen.queryAllByRole('listitem').map(({ textContent }) => textContent)

describe('useDrillActions', () => {
    it('says “a level” for a parent without a known name', () => {
        renderWithStore(
            <PluginSourcesProvider sources={sources}>
                <Labels
                    clicked={{
                        id: 'DemoChN0101',
                        path: '/DemoLand001/DemoNorth01/DemoChN0101',
                    }}
                />
            </PluginSourcesProvider>
        )

        expect(labels()).toEqual(['Drill up a level'])
    })

    it('offers nothing from the ⋯ menu of a view that set no org unit', () => {
        const { store } = renderWithStore(
            <PluginSourcesProvider sources={sources}>
                <Labels />
            </PluginSourcesProvider>
        )
        expect(labels()).toEqual([])

        /* A unit without a name is named by its id */
        act(() => {
            store.dispatch(viewAdded({ id: 'map-1', type: 'map', number: 1 }))
            store.dispatch(
                dataClicked({
                    viewId: 'map-1',
                    click: {
                        ou: {
                            id: 'DemoNorth01',
                            path: '/DemoLand001/DemoNorth01',
                        },
                    },
                    additive: false,
                })
            )
        })
        expect(labels()).toEqual([
            'Drill down into DemoNorth01',
            'Drill up a level',
        ])
    })
})
