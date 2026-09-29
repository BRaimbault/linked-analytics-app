import {
    mockContainerSize,
    renderWorkspace,
    toolsStrip,
} from '@components/workspace/__tests__/render-workspace'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

mockContainerSize()

/* jsdom lays nothing out, so a view's body has no size to give its plugin */
vi.mock('@components/plugins/use-element-size', () => ({
    useElementSize: () => ({ width: 600, height: 400 }),
}))

/* Settings panels stay mounted: the newest view's picker is the last */
const openItem = async (viewTitle: string, itemName: string) => {
    await userEvent.click(toolsStrip().getByRole('tab', { name: viewTitle }))
    const picker = (await screen.findAllByTestId('saved-item-picker')).at(
        -1
    ) as HTMLElement
    await userEvent.click(
        within(picker).getByTestId('dhis2-uicore-select-input')
    )
    await userEvent.click(await screen.findByText(itemName))
}

const addView = async (type: string) => {
    await userEvent.click(toolsStrip().getByRole('tab', { name: 'Add views' }))
    await userEvent.click(screen.getByTestId(`add-view-${type}`))
}

/* A map of malaria by district, and the ANC chart by month */
const renderMapAndChart = async () => {
    const view = await renderWorkspace({ demo: true })
    await addView('map')
    await openItem('Map 1', 'Malaria cases by district')
    await addView('visualization')
    await openItem('Visualization 1', 'ANC visits, last 12 months')
    await screen.findByTestId('fake-chart')
    return view
}

const feature = (name: string) =>
    screen
        .getAllByTestId('fake-feature')
        .find((path) => path.textContent?.startsWith(`${name}:`)) as Element

const featureNames = () =>
    screen
        .getAllByTestId('fake-feature')
        .map(({ textContent }) => textContent?.split(':')[0])

/* The ANC chart's subtitle, its filter: the org unit it follows */
const chartFollows = () =>
    screen.getByTestId('fake-visualization').firstElementChild?.children[1]
        ?.textContent

const menuItems = () =>
    within(screen.getByTestId('drill-menu'))
        .getAllByRole('menuitem')
        .map(({ textContent }) => textContent)

const choose = async (label: string) =>
    userEvent.click(await screen.findByRole('menuitem', { name: label }))

const openViewMenu = async (title: string) => {
    const cell = [...document.querySelectorAll('.dv-grid-view .dv-groupview')]
        .find((group) => group.querySelector('.dv-tab')?.textContent === title)
        ?.querySelector('[data-test="view-actions-button"]') as HTMLElement
    await userEvent.click(cell)
}

describe('drilling a view', () => {
    it('drills down into a right-clicked unit, and up to the level of its parent', async () => {
        await renderMapAndChart()

        fireEvent.contextMenu(feature('East'))
        expect(menuItems()).toEqual([
            'Drill down into East',
            'Drill up to Demoland',
        ])
        await choose('Drill down into East')

        await waitFor(() =>
            expect(featureNames()).toEqual([
                'Dawn Plains',
                'Elm Ridge',
                'Fern Lake',
                'Granite Bay',
            ])
        )
        /* A drill counts as a click: the chart follows East */
        await waitFor(() => expect(chartFollows()).toBe('East'))

        /* The deepest level: up, or back */
        fireEvent.contextMenu(feature('Elm Ridge'))
        expect(menuItems()).toEqual([
            'Drill up to East',
            'Back to the saved item',
        ])
        await choose('Drill up to East')
        await waitFor(() =>
            expect(featureNames()).toEqual(['North', 'West', 'East', 'South'])
        )
        expect(chartFollows()).toBe('East')

        /* A district's parent is the top: shown alone */
        fireEvent.contextMenu(feature('North'))
        await choose('Drill up to Demoland')
        await waitFor(() => expect(featureNames()).toEqual(['Demoland']))
        expect(chartFollows()).toBe('Demoland')

        fireEvent.contextMenu(feature('Demoland'))
        expect(menuItems()).toEqual([
            'Drill down into Demoland',
            'Back to the saved item',
        ])
        await choose('Back to the saved item')
        await waitFor(() =>
            expect(featureNames()).toEqual(['North', 'West', 'East', 'South'])
        )
    })

    it('opens no menu where there is nothing to drill, and closes it with Escape', async () => {
        await renderMapAndChart()

        /* A point of the chart by month carries no org unit */
        fireEvent.contextMenu(screen.getAllByTestId('fake-point')[0])
        expect(screen.queryByTestId('drill-menu')).toBeNull()

        fireEvent.contextMenu(feature('East'))
        await userEvent.keyboard('{Escape}')
        await waitFor(() =>
            expect(screen.queryByTestId('drill-menu')).toBeNull()
        )
    })

    it('drills from the ⋯ menu, from the unit the view set and then from what it shows', async () => {
        await renderMapAndChart()
        fireEvent.click(feature('North'))

        await openViewMenu('Map 1')
        await choose('Drill down into North')
        await waitFor(() =>
            expect(featureNames()).toEqual([
                'Amber Hills',
                'Birch Valley',
                'Cedar Coast',
            ])
        )

        /* Drilled into North: up to North's level, the districts */
        await openViewMenu('Map 1')
        await choose('Drill up to North')
        await waitFor(() =>
            expect(featureNames()).toEqual(['North', 'West', 'East', 'South'])
        )
    })
})
