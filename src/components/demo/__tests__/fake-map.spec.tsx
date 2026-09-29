import { FakeMap } from '@components/demo/fake-map'
import { DEMO_MAPS } from '@modules/demo/saved-items'
import type { MapObject } from '@modules/visualization/analytical-object'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const [pentaMap, malariaMap] = DEMO_MAPS

const draw = (
    map: MapObject,
    props: Partial<Parameters<typeof FakeMap>[0]> = {}
) => render(<FakeMap visualization={map} width={500} height={400} {...props} />)

const plane = () => screen.getByTestId('fake-map-plane')
const scaleOf = () =>
    Number(
        /scale\(([\d.]+)\)/.exec(plane().getAttribute('transform') ?? '')?.[1]
    )

describe('FakeMap', () => {
    it('draws the thematic layer, a feature per org unit, with its legend', () => {
        draw(pentaMap)

        expect(screen.getAllByTestId('fake-feature')).toHaveLength(14)
        expect(
            screen.getByText('Penta 3 coverage <1y · Last 12 months')
        ).toBeInTheDocument()
        expect(screen.getByTestId('fake-map-legend')).toHaveTextContent(
            'LowMediumHigh'
        )
        expect(
            screen.getAllByTestId('fake-feature')[0].querySelector('title')
        ).toHaveTextContent(/^Amber Hills: [\d.]+$/)
    })

    it('sends a clicked feature’s org unit and the layer’s data item, additive with Ctrl or Cmd', () => {
        const onDataClick = vi.fn()
        draw(malariaMap, { onDataClick })
        const [north] = screen.getAllByTestId('fake-feature')

        fireEvent.click(north)
        fireEvent.click(north, { ctrlKey: true })

        expect(onDataClick).toHaveBeenNthCalledWith(
            1,
            {
                ou: {
                    id: 'DemoNorth01',
                    name: 'North',
                    path: '/DemoLand001/DemoNorth01',
                    level: 'DemoLevel02',
                },
                dx: { id: 'DemoMalar01', name: 'Malaria cases confirmed' },
            },
            { additive: false }
        )
        expect(onDataClick).toHaveBeenLastCalledWith(expect.anything(), {
            additive: true,
        })
    })

    it('pans with a drag, which doesn’t count as a click, and not on a hover', async () => {
        vi.useFakeTimers()
        const onDataClick = vi.fn()
        draw(malariaMap, { onDataClick })
        const svg = screen.getByRole('img')
        const [north] = screen.getAllByTestId('fake-feature')
        const before = plane().getAttribute('transform')

        /* A hover with no button down leaves the map where it is */
        fireEvent.pointerDown(svg, { clientX: 0, clientY: 0 })
        fireEvent.pointerUp(svg)
        fireEvent.pointerMove(svg, { clientX: 50, clientY: 0, buttons: 0 })
        expect(plane().getAttribute('transform')).toBe(before)

        fireEvent.pointerDown(svg, { clientX: 0, clientY: 0 })
        fireEvent.pointerMove(svg, { clientX: 1, clientY: 0, buttons: 1 })
        fireEvent.pointerMove(svg, { clientX: 40, clientY: 10, buttons: 1 })
        fireEvent.pointerUp(svg)
        fireEvent.click(north)
        act(() => vi.runAllTimers())

        expect(plane().getAttribute('transform')).not.toBe(before)
        expect(onDataClick).not.toHaveBeenCalled()

        /* The next press is a click again */
        fireEvent.pointerDown(svg, { clientX: 0, clientY: 0 })
        fireEvent.pointerUp(svg)
        fireEvent.click(north)
        expect(onDataClick).toHaveBeenCalledTimes(1)
        vi.useRealTimers()
    })

    it('zooms with the wheel and its buttons, within limits, and back to the whole map', async () => {
        draw(malariaMap)
        const svg = screen.getByRole('img')
        const whole = scaleOf()

        /* The wheel zooms instead of scrolling the page */
        expect(fireEvent.wheel(svg, { deltaY: -100 })).toBe(false)
        expect(scaleOf()).toBeCloseTo(whole * 1.25)
        fireEvent.wheel(svg, { deltaY: 100 })
        fireEvent.wheel(svg, { deltaY: 100 })
        /* Not smaller than the whole map */
        expect(scaleOf()).toBeCloseTo(whole)

        await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
        await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
        await userEvent.click(screen.getByRole('button', { name: 'Zoom out' }))
        expect(scaleOf()).toBeCloseTo(whole * 1.25)
        await userEvent.click(screen.getByRole('button', { name: 'Whole map' }))
        expect(scaleOf()).toBeCloseTo(whole)
    })

    it('keeps its zoom when the map it shows changes', async () => {
        const { rerender } = draw(malariaMap)
        await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
        const zoomed = scaleOf()

        rerender(<FakeMap visualization={pentaMap} width={500} height={400} />)

        expect(scaleOf()).toBe(zoomed)
        expect(screen.getAllByTestId('fake-feature')).toHaveLength(14)
    })

    it('dims what the highlight leaves out, and says when it has drawn', () => {
        const onLoadingComplete = vi.fn()
        draw(malariaMap, {
            highlight: { ou: ['DemoSouth01'] },
            onLoadingComplete,
        })

        expect(
            screen
                .getAllByTestId('fake-feature')
                .map((feature) =>
                    feature.getAttribute('class')?.includes('dimmed')
                )
        ).toEqual([true, true, true, false])
        expect(onLoadingComplete).toHaveBeenCalledTimes(1)
    })

    it('draws a layer without data, clicked with no listener, and says when there is no layer', () => {
        const withoutData: MapObject = {
            ...malariaMap,
            mapViews: [{ ...malariaMap.mapViews[0], columns: [] }],
        }
        const { unmount } = draw(withoutData)
        const [feature] = screen.getAllByTestId('fake-feature')

        fireEvent.click(feature)
        expect(feature.querySelector('title')).toHaveTextContent(
            'North: No value'
        )
        unmount()

        draw({ ...malariaMap, mapViews: [] })
        expect(screen.getByText('No layer to show')).toBeInTheDocument()
    })

    it('sends a click without data item for a layer without one', () => {
        const onDataClick = vi.fn()
        draw(
            {
                ...malariaMap,
                mapViews: [{ ...malariaMap.mapViews[0], columns: [] }],
            },
            { onDataClick }
        )

        fireEvent.click(screen.getAllByTestId('fake-feature')[0])

        expect(onDataClick.mock.lastCall?.[0]).not.toHaveProperty('dx')
    })
})
