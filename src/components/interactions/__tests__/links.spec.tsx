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

/* A map of malaria by district, and a chart of the same by district */
const renderLinkedViews = async () => {
    await renderWorkspace({ demo: true })
    await addView('map')
    await openItem('Map 1', 'Malaria cases by district')
    await addView('visualization')
    await openItem(
        'Visualization 1',
        'Malaria cases by district, last 12 months'
    )
    await screen.findByTestId('fake-chart')
}

const feature = (name: string) =>
    screen
        .getAllByTestId('fake-feature')
        .find((path) => path.textContent?.startsWith(`${name}:`)) as Element

const featureNames = () =>
    screen
        .getAllByTestId('fake-feature')
        .map(({ textContent }) => textContent?.split(':')[0])

const option = async (label: string) =>
    (await screen.findAllByTestId('dhis2-uicore-singleselectoption')).find(
        ({ textContent }) => textContent === label
    ) as HTMLElement

const chartCategories = () =>
    [...screen.getByTestId('fake-chart').querySelectorAll('text')]
        .map(({ textContent }) => textContent)
        .filter((text) => !/^[\d,]+$/.test(text as string))

const badges = () =>
    screen
        .getAllByTestId(/^channel-badge-/)
        .map((badge) => badge.getAttribute('aria-label'))

describe('linked views', () => {
    it('makes the chart follow a district clicked on the map', async () => {
        await renderLinkedViews()
        expect(chartCategories()).toEqual(['North', 'West', 'East', 'South'])
        expect(screen.queryByTestId('channel-badges')).toBeNull()

        fireEvent.click(feature('North'))

        /* The district's chiefdoms, as DHIS2 reads North;LEVEL-3 */
        await waitFor(() =>
            expect(chartCategories()).toEqual([
                'Amber Hills',
                'Birch Valley',
                'Cedar Coast',
            ])
        )
        /* The map isn't rewritten by its own click; it highlights it */
        expect(featureNames()).toEqual(['North', 'West', 'East', 'South'])
        expect(feature('West').getAttribute('class')).toMatch(/dimmed/)
        expect(feature('North').getAttribute('class')).not.toMatch(/dimmed/)
        expect(badges()).toEqual([
            'Org unit A. North. Sends clicks and follows the value',
            'Org unit A. North. Sends clicks and follows the value',
        ])
    })

    it('shows every view again when the district is clicked twice', async () => {
        await renderLinkedViews()
        fireEvent.click(feature('North'))
        await waitFor(() => expect(chartCategories()[0]).toBe('Amber Hills'))

        fireEvent.click(feature('North'))

        await waitFor(() =>
            expect(chartCategories()).toEqual([
                'North',
                'West',
                'East',
                'South',
            ])
        )
        expect(feature('West').getAttribute('class')).not.toMatch(/dimmed/)
    })

    it('lets a selector set the value for every view', async () => {
        await renderLinkedViews()
        await addView('org-unit-selector')
        const selector = await screen.findByTestId('selector-view')
        expect(selector).toHaveTextContent('Org unit A')

        await userEvent.click(
            within(selector).getByTestId('dhis2-uicore-select-input')
        )
        await userEvent.click(await option('West'))

        const westChiefdoms = [
            'Kestrel',
            'Lark Meadow',
            'Maple Point',
            'Nettle Hill',
        ]
        /* The map follows too: no view set the value */
        await waitFor(() => expect(chartCategories()).toEqual(westChiefdoms))
        await waitFor(() => expect(featureNames()).toEqual(westChiefdoms))
        expect(badges()).toContain('Org unit A. West. Sets the value')
    })

    it('lists a clicked value outside the selector’s list, and several as its placeholder', async () => {
        await renderLinkedViews()
        await addView('org-unit-selector')
        const selector = await screen.findByTestId('selector-view')

        fireEvent.click(feature('North'))
        fireEvent.click(feature('South'), { ctrlKey: true })

        await waitFor(() => expect(selector).toHaveTextContent('North, South'))
    })
})
