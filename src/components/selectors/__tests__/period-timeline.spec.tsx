import {
    PluginLoadsProvider,
    usePluginLoads,
} from '@components/plugins/plugin-loads'
import {
    NO_PLUGIN_SOURCES,
    PluginSourcesProvider,
} from '@components/plugins/plugin-sources'
import {
    LOAD_TIMEOUT,
    STEP_PAUSE,
} from '@components/selectors/use-timeline-play'
import { renderWithStore } from '@components/workspace/__tests__/render-with-store'
import { SelectorPanel } from '@components/workspace/panels/selector-panel'
import type { PluginLoads } from '@modules/plugins/plugin-loads'
import {
    highlightOnlyChanged,
    selectorValueChanged,
    viewRolesChanged,
} from '@store/interactions-slice'
import { viewAdded } from '@store/workspace-slice'
import { act, fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const MONTHS = [
    { id: '202601', name: 'January 2026' },
    { id: '202602', name: 'February 2026' },
    { id: '202603', name: 'March 2026' },
]

/* Lets a test say when a plugin view has drawn */
let loads: PluginLoads
const LoadsProbe = () => {
    loads = usePluginLoads()
    return null
}

const renderTimeline = (periods = MONTHS) => {
    const view = renderWithStore(
        <PluginSourcesProvider
            sources={{ ...NO_PLUGIN_SOURCES, timelinePeriods: periods }}
        >
            <PluginLoadsProvider>
                <LoadsProbe />
                <SelectorPanel viewId="pe-1" items={[]} control="timeline" />
            </PluginLoadsProvider>
        </PluginSourcesProvider>
    )
    act(() => {
        view.store.dispatch(
            viewAdded({ id: 'pe-1', type: 'period-selector', number: 1 })
        )
        view.store.dispatch(viewAdded({ id: 'map-1', type: 'map', number: 1 }))
        /* Views that don't draw again for a period, which play doesn't
         * wait for: one that doesn't follow it, one that highlights it */
        view.store.dispatch(viewAdded({ id: 'map-2', type: 'map', number: 2 }))
        view.store.dispatch(
            viewRolesChanged({
                viewId: 'map-2',
                dimension: 'pe',
                roles: { send: true, receive: false },
            })
        )
        view.store.dispatch(viewAdded({ id: 'map-3', type: 'map', number: 3 }))
        view.store.dispatch(
            highlightOnlyChanged({
                viewId: 'map-3',
                dimension: 'pe',
                highlightOnly: true,
            })
        )
    })
    const value = () =>
        view.store.getState().interactions.channels[0].value.map(({ id }) => id)
    return { ...view, value }
}

const button = (name: string) => screen.getByRole('button', { name })
const shown = () => screen.getByTestId('selector-value').textContent

describe('PeriodTimeline', () => {
    it('steps through its periods, within the track, and by the track', () => {
        const { value } = renderTimeline()
        expect(shown()).toBe('Each view shows its own')
        expect(screen.getByTestId('timeline-track')).toHaveAttribute(
            'data-off-track'
        )

        fireEvent.click(button('Next period'))
        expect(value()).toEqual(['202601'])
        expect(button('Previous period')).toBeDisabled()
        fireEvent.click(button('Next period'))
        fireEvent.click(button('Next period'))
        expect(value()).toEqual(['202603'])
        expect(button('Next period')).toBeDisabled()
        expect(shown()).toBe('March 2026')
        expect(screen.getByTestId('timeline-track')).toHaveAttribute(
            'aria-valuetext',
            'March 2026'
        )

        fireEvent.click(button('Previous period'))
        expect(value()).toEqual(['202602'])
        fireEvent.change(screen.getByTestId('timeline-track'), {
            target: { value: '0' },
        })
        expect(value()).toEqual(['202601'])
    })

    it('clears its period, pausing play, for each view to show its own again', async () => {
        vi.useFakeTimers()
        const { value } = renderTimeline()
        expect(screen.queryByTestId('timeline-clear')).toBeNull()

        fireEvent.click(button('Play'))
        fireEvent.click(button('Clear'))

        expect(value()).toEqual([])
        expect(shown()).toBe('Each view shows its own')
        expect(screen.queryByTestId('timeline-clear')).toBeNull()
        await act(() => vi.advanceTimersByTimeAsync(LOAD_TIMEOUT))
        expect(value()).toEqual([])
        vi.useRealTimers()
    })

    it('shows a period off the track, a quarter, as text only', () => {
        const { store } = renderTimeline()

        act(() => {
            store.dispatch(
                selectorValueChanged({
                    viewId: 'pe-1',
                    value: [{ id: '2026Q1', name: 'January - March 2026' }],
                })
            )
        })

        expect(shown()).toBe('January - March 2026')
        const track = screen.getByTestId('timeline-track')
        expect(track).toHaveAttribute('data-off-track')
        expect(track).toHaveAttribute('aria-valuetext', 'January - March 2026')
        /* A step from off the track goes to its last period back */
        fireEvent.click(button('Previous period'))
        expect(shown()).toBe('March 2026')
    })

    it('plays to the last period, each step waiting for the views it drives, and stops', async () => {
        vi.useFakeTimers()
        const { value } = renderTimeline()

        fireEvent.click(button('Play'))
        expect(value()).toEqual(['202601'])
        expect(button('Pause')).toBeInTheDocument()

        /* The map hasn't drawn yet: the step waits */
        await act(() => vi.advanceTimersByTimeAsync(STEP_PAUSE))
        expect(value()).toEqual(['202601'])
        act(() => loads.reportLoaded('map-1'))
        await act(() => vi.advanceTimersByTimeAsync(0))
        expect(value()).toEqual(['202602'])

        /* One that never says holds a step no longer than the timeout */
        await act(() => vi.advanceTimersByTimeAsync(LOAD_TIMEOUT))
        expect(value()).toEqual(['202603'])
        await act(() => vi.advanceTimersByTimeAsync(LOAD_TIMEOUT))
        expect(value()).toEqual(['202603'])
        expect(button('Play')).toBeInTheDocument()

        /* Again from the last: from the first */
        fireEvent.click(button('Play'))
        expect(value()).toEqual(['202601'])
        vi.useRealTimers()
    })

    it('pauses on its own pause button, a step, or another value', async () => {
        vi.useFakeTimers()
        const { store, value } = renderTimeline()

        fireEvent.click(button('Play'))
        fireEvent.click(button('Pause'))
        await act(() => vi.advanceTimersByTimeAsync(LOAD_TIMEOUT))
        expect(value()).toEqual(['202601'])

        fireEvent.click(button('Play'))
        fireEvent.click(button('Next period'))
        expect(button('Play')).toBeInTheDocument()

        fireEvent.click(button('Play'))
        act(() => {
            store.dispatch(selectorValueChanged({ viewId: 'pe-1', value: [] }))
        })
        expect(button('Play')).toBeInTheDocument()
        await act(() => vi.advanceTimersByTimeAsync(LOAD_TIMEOUT))
        expect(value()).toEqual([])
        vi.useRealTimers()
    })

    it('is a drop-down when its source has no periods for it', () => {
        renderTimeline([])

        expect(screen.queryByTestId('period-timeline')).toBeNull()
        expect(screen.getByTestId('selector-pe-1')).toBeInTheDocument()
    })
})
