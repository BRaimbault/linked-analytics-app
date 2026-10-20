import { ChannelBadges } from '@components/interactions/channel-badges'
import { LinksSection } from '@components/interactions/links-section'
import { renderWithStore } from '@components/workspace/__tests__/render-with-store'
import type { ViewType } from '@modules/workspace/view-types'
import { selectChannels } from '@store/interactions-slice'
import { viewAdded } from '@store/workspace-slice'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

const VIEWS: { id: string; type: ViewType; number: number }[] = [
    { id: 'map-1', type: 'map', number: 1 },
    { id: 'vis-1', type: 'visualization', number: 1 },
    { id: 'ou-1', type: 'org-unit-selector', number: 1 },
    { id: 'pe-1', type: 'period-selector', number: 1 },
]

/* A map, a visualization, and an org unit and a period selector: channels
 * A (org unit) and B (period), which both views joined */
const renderLinks = (viewId: string, type: ViewType) => {
    const view = renderWithStore(
        <>
            <LinksSection viewId={viewId} type={type} />
            <ChannelBadges viewId={viewId} />
        </>
    )
    act(() => {
        for (const added of VIEWS) {
            view.store.dispatch(viewAdded(added))
        }
    })
    return {
        ...view,
        channels: () => selectChannels(view.store.getState()),
    }
}

const row = (dimension: string) => screen.getByTestId(`links-${dimension}`)

const pick = async (testId: string, option: string) => {
    await userEvent.click(
        within(screen.getByTestId(testId)).getByTestId(
            'dhis2-uicore-select-input'
        )
    )
    const options = await screen.findAllByTestId(
        'dhis2-uicore-singleselectoption'
    )
    await userEvent.click(
        options.find(({ textContent }) => textContent === option) as HTMLElement
    )
}

const checkbox = (testId: string) =>
    within(screen.getByTestId(testId)).getByRole('checkbox')

/* A disabled checkbox's reason: its tooltip, opened by focusing the
 * tooltip's wrapper, as the keyboard does */
const reasonOf = async (testId: string) => {
    const wrapper = screen
        .getByTestId(testId)
        .closest('[data-test="dhis2-uicore-tooltip-reference"]') as HTMLElement
    act(() => wrapper.focus())
    const tooltip = await screen.findByTestId('dhis2-uicore-tooltip-content')
    const text = tooltip.textContent
    act(() => wrapper.blur())
    await waitFor(() =>
        expect(screen.queryByTestId('dhis2-uicore-tooltip-content')).toBeNull()
    )
    return text
}

const badge = (label: string) =>
    screen.getByTestId(`channel-badge-${label}`).getAttribute('aria-label')

describe('LinksSection', () => {
    it('shows a view’s channel per dimension, and what it sends and follows', () => {
        renderLinks('vis-1', 'visualization')

        /* The field names the dimension; the select, the channel */
        expect(row('ou')).toHaveTextContent(
            /^Org unitChannelA · Nothing selected/
        )
        expect(row('pe')).toHaveTextContent(
            /^PeriodChannelB · Nothing selected/
        )
        expect(checkbox('links-ou-send')).toBeChecked()
        expect(checkbox('links-ou-receive')).toBeChecked()
    })

    it('says why a map sends no periods, from the keyboard too', async () => {
        renderLinks('map-1', 'map')

        expect(checkbox('links-pe-send')).toBeDisabled()
        expect(checkbox('links-pe-send')).not.toBeChecked()
        expect(await reasonOf('links-pe-send')).toBe(
            'A click on a map carries no period.'
        )
        expect(badge('B')).toContain('Follows the value')
    })

    it('stops sending or following, and shows it in the badge', async () => {
        const { channels } = renderLinks('vis-1', 'visualization')

        await userEvent.click(checkbox('links-ou-receive'))

        expect(channels()[0].members['vis-1']).toEqual({
            send: true,
            receive: false,
        })
        expect(badge('A')).toMatch(/Sets the value by clicking$/)

        await userEvent.click(checkbox('links-ou-send'))

        expect(channels()[0].members).not.toHaveProperty('vis-1')
        expect(screen.queryByTestId('links-ou-send')).toBeNull()
    })

    it('sets what a view shows for a selected org unit, while it follows it', async () => {
        const { channels } = renderLinks('vis-1', 'visualization')
        expect(screen.getByTestId('links-ou-depth')).toHaveTextContent(
            'ShowSub-units'
        )

        await pick('links-ou-depth', 'Selected org unit')
        expect(channels()[0].members['vis-1'].depth).toBe(0)

        await userEvent.click(checkbox('links-ou-receive'))
        expect(screen.queryByTestId('links-ou-depth')).toBeNull()
        /* Periods have no depth */
        expect(within(row('pe')).queryByText('Selected org unit')).toBeNull()
    })

    it('moves a view to a new channel, or to none', async () => {
        const { channels } = renderLinks('vis-1', 'visualization')

        await pick('links-ou-channel', 'New channel')

        expect(
            channels().map(({ label, members }) => [
                label,
                Object.keys(members),
            ])
        ).toEqual([
            ['A', ['map-1']],
            ['B', ['map-1', 'vis-1']],
            ['C', ['vis-1']],
        ])

        /* Back to A: C, left empty, goes */
        await pick('links-ou-channel', 'A · Nothing selected')
        expect(channels().map(({ label }) => label)).toEqual(['A', 'B'])

        await pick('links-pe-channel', 'None')

        expect(channels()[1].members).not.toHaveProperty('vis-1')
        expect(screen.queryByTestId('links-pe-send')).toBeNull()
    })

    it('lets a selector drive a new channel', async () => {
        const { channels } = renderLinks('ou-1', 'org-unit-selector')
        expect(screen.getByTestId('links-selector')).toHaveTextContent(
            'A · Nothing selected'
        )
        /* Both roles, always */
        for (const testId of [
            'links-selector-send',
            'links-selector-receive',
        ]) {
            expect(checkbox(testId)).toBeChecked()
            expect(checkbox(testId)).toBeDisabled()
            expect(await reasonOf(testId)).toMatch(/^A selector always/)
        }

        await pick('links-selector-channel', 'New channel')

        expect(
            channels().map(({ label, selectorViewId }) => [
                label,
                selectorViewId,
            ])
        ).toEqual([
            ['A', null],
            ['B', 'pe-1'],
            ['C', 'ou-1'],
        ])

        await pick('links-selector-channel', 'A · Nothing selected')

        expect(channels()[0].selectorViewId).toBe('ou-1')
    })

    it('has no rows for a view that links nothing', () => {
        renderLinks('text-1', 'text')

        expect(screen.getByTestId('links-section')).toHaveTextContent('Links')
        expect(screen.queryByTestId('links-selector')).toBeNull()
    })
})
