import { DemoDataProvider } from '@components/demo/demo-data-provider'
import {
    NO_PLUGIN_SOURCES,
    PluginSourcesProvider,
} from '@components/plugins/plugin-sources'
import { renderWithStore } from '@components/workspace/__tests__/render-with-store'
import { SelectorPanel } from '@components/workspace/panels/selector-panel'
import { ORG_UNIT_LEVELS } from '@modules/demo/org-units'
import { DEMO_TREE_ROOTS } from '@modules/demo/selector-items'
import { selectorValueChanged } from '@store/interactions-slice'
import { viewAdded } from '@store/workspace-slice'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const renderTree = (roots = DEMO_TREE_ROOTS) => {
    const view = renderWithStore(
        <DemoDataProvider>
            <PluginSourcesProvider
                sources={{
                    ...NO_PLUGIN_SOURCES,
                    orgUnitTreeRoots: roots,
                    orgUnitLevelCount: ORG_UNIT_LEVELS.length,
                }}
            >
                <SelectorPanel viewId="ou-1" items={[]} control="tree" />
            </PluginSourcesProvider>
        </DemoDataProvider>
    )
    act(() => {
        view.store.dispatch(
            viewAdded({ id: 'ou-1', type: 'org-unit-selector', number: 1 })
        )
    })
    const value = () => view.store.getState().interactions.channels[0].value
    return { ...view, value }
}

const tree = () => within(screen.getByTestId('org-unit-tree'))
const shown = () => tree().getByTestId('selector-value').textContent

/* A unit's node, not the selected value's text above the tree */
const node = (name: string) =>
    tree()
        .queryAllByText(name)
        .find((element) => !element.closest('[data-test="selector-value"]'))

const toggleOf = (name: string) =>
    (node(name) as HTMLElement)
        .closest('[data-test$="-node"]')
        ?.querySelector('[data-test$="-node-toggle"]') as HTMLElement

describe('OrgUnitTree', () => {
    it('opens its root, and selects a unit, then none when clicked again', async () => {
        const { value } = renderTree()
        await waitFor(() => expect(node('South')).toBeDefined())
        expect(shown()).toBe('Each view shows its own')

        await userEvent.click(node('South') as HTMLElement)
        expect(value()).toEqual([
            {
                id: 'DemoSouth01',
                path: '/DemoLand001/DemoSouth01',
                name: 'South',
            },
        ])
        expect(shown()).toBe('South')

        await userEvent.click(node('South') as HTMLElement)
        expect(value()).toEqual([])
    })

    it('opens the branch of a unit set elsewhere, which the user may close again', async () => {
        const { store } = renderTree()
        await waitFor(() => expect(node('South')).toBeDefined())

        act(() => {
            store.dispatch(
                selectorValueChanged({
                    viewId: 'ou-1',
                    value: [
                        {
                            id: 'DemoChS0103',
                            name: 'Juniper',
                            path: '/DemoLand001/DemoSouth01/DemoChS0103',
                        },
                    ],
                })
            )
        })
        await waitFor(() => expect(node('Juniper')).toBeDefined())
        expect(shown()).toBe('Juniper')

        await userEvent.click(toggleOf('South'))
        await waitFor(() => expect(node('Juniper')).toBeUndefined())
        await userEvent.click(toggleOf('South'))
        await waitFor(() => expect(node('Juniper')).toBeDefined())
    })

    it('adds and removes units with Ctrl or Cmd, and selects several set elsewhere', async () => {
        const { store, value } = renderTree()
        await waitFor(() => expect(node('Juniper')).toBeDefined())
        const ids = () => value().map(({ id }) => id)

        await userEvent.click(node('Harbor') as HTMLElement)
        fireEvent.click(node('Kestrel') as HTMLElement, { ctrlKey: true })
        expect(ids()).toEqual(['DemoChS0101', 'DemoChW0101'])
        expect(shown()).toBe('Harbor, Kestrel')

        fireEvent.click(node('Harbor') as HTMLElement, { metaKey: true })
        expect(ids()).toEqual(['DemoChW0101'])
        /* A plain click on a unit of several selects it alone */
        act(() => {
            store.dispatch(
                selectorValueChanged({
                    viewId: 'ou-1',
                    value: [
                        {
                            id: 'DemoNorth01',
                            path: '/DemoLand001/DemoNorth01',
                        },
                        {
                            id: 'DemoSouth01',
                            path: '/DemoLand001/DemoSouth01',
                        },
                    ],
                })
            )
        })
        expect(
            screen
                .getAllByTestId(/-node-label$/)
                .filter((label) => label.querySelector('.checked'))
        ).toHaveLength(2)
        await userEvent.click(node('South') as HTMLElement)
        expect(ids()).toEqual(['DemoSouth01'])

        /* A unit with no path can't be placed in the tree: named only */
        act(() => {
            store.dispatch(
                selectorValueChanged({
                    viewId: 'ou-1',
                    value: [{ id: 'DemoNorth01', name: 'North' }],
                })
            )
        })
        expect(shown()).toBe('North')
        expect(
            screen
                .getAllByTestId(/-node-label$/)
                .filter((label) => label.querySelector('.checked'))
        ).toHaveLength(0)
    })

    describe('opening as far as it fits', () => {
        /* jsdom lays nothing out: each shown row is 24px high, and the box
         * holds `rows` of them */
        const fitRows = (rows: number) => {
            vi.spyOn(
                HTMLElement.prototype,
                'scrollHeight',
                'get'
            ).mockImplementation(function (this: HTMLElement) {
                return (
                    this.querySelectorAll('[data-test$="-node-label"]').length *
                    24
                )
            })
            vi.spyOn(
                HTMLElement.prototype,
                'clientHeight',
                'get'
            ).mockReturnValue(rows * 24)
        }

        it('opens every level when they fit, down to the deepest', async () => {
            fitRows(30)
            renderTree()

            await waitFor(() => expect(node('Juniper')).toBeDefined())
            await waitFor(() =>
                expect(document.querySelector('[data-settling]')).toBeNull()
            )
            vi.restoreAllMocks()
        })

        it('closes a level again when it doesn’t fit, and shows the tree then', async () => {
            fitRows(10)
            renderTree()

            await waitFor(() =>
                expect(document.querySelector('[data-settling]')).toBeNull()
            )
            expect(node('South')).toBeDefined()
            expect(node('Juniper')).toBeUndefined()
            vi.restoreAllMocks()
        })

        it('stops once the user opens or closes a branch', async () => {
            fitRows(10)
            renderTree()
            await waitFor(() => expect(node('South')).toBeDefined())

            await userEvent.click(toggleOf('South'))

            expect(document.querySelector('[data-settling]')).toBeNull()
            await waitFor(() => expect(node('Juniper')).toBeDefined())
            vi.restoreAllMocks()
        })
    })

    it('is a drop-down when its source has no roots for it', () => {
        renderTree([])

        expect(screen.queryByTestId('org-unit-tree')).toBeNull()
        expect(screen.getByTestId('selector-ou-1')).toBeInTheDocument()
    })
})
