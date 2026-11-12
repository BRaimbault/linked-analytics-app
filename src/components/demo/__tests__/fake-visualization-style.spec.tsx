import { FakeVisualization } from '@components/demo/fake-visualization'
import { COLOR_SETS } from '@components/demo/series-colors'
import { colorSets } from '@dhis2/analytics'
import { DATA_ITEM_IDS } from '@modules/demo/data-items'
import {
    PRECIPITATION_STYLE,
    TEMPERATURE_STYLE,
} from '@modules/demo/raster-styles'
import { DEMO_VISUALIZATIONS } from '@modules/demo/saved-items'
import type {
    Dimension,
    VisualizationObject,
} from '@modules/visualization/analytical-object'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

const savedItem = (id: string) =>
    DEMO_VISUALIZATIONS.find((item) => item.id === id) as VisualizationObject

const climateByMonth = savedItem('DemoVisClm1')
const temperatureByMonth = savedItem('DemoVisTmp1')
const malariaColumns = savedItem('DemoVisMal1')
const ancVisits = savedItem('DemoVisAnc1')

/* The chart as a link rewrites it: another org unit or data item */
const linked = (
    object: VisualizationObject,
    { ou, dx }: { ou?: string; dx?: string }
): VisualizationObject => {
    const replace = (entries: Dimension[]) =>
        entries.map((entry) => {
            if (ou && entry.dimension === 'ou') {
                return { ...entry, items: [{ id: ou }] }
            }
            if (dx && entry.dimension === 'dx') {
                return { ...entry, items: [{ id: dx }] }
            }
            return entry
        })
    return {
        ...object,
        columns: replace(object.columns),
        filters: replace(object.filters),
    }
}

const draw = (visualization: VisualizationObject) =>
    render(
        <FakeVisualization
            visualization={visualization}
            width={600}
            height={400}
        />
    )

/* The top of the value axis, as its highest tick reads */
const axisTop = () =>
    Math.max(
        ...[...screen.getByTestId('fake-chart').querySelectorAll('text')]
            .map(({ textContent }) => Number(textContent?.replace(/,/g, '')))
            .filter((value) => !Number.isNaN(value))
    )

const swatches = () =>
    screen
        .getAllByTestId('fake-legend-series')
        .map(
            (series) =>
                (series.querySelector('span') as HTMLElement).style.background
        )

const rgb = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((at) =>
        Number.parseInt(hex.slice(at, at + 2), 16)
    )
    return `rgb(${r}, ${g}, ${b})`
}

describe('FakeVisualization styles', () => {
    it("copies DV's default and dark color sets", () => {
        expect(COLOR_SETS.DEFAULT).toEqual(colorSets.DEFAULT.colors)
        expect(COLOR_SETS.DARK).toEqual(colorSets.DARK.colors)
    })

    it('draws one data item in its chart style: precipitation in columns, temperature in a line', () => {
        const { rerender } = draw(climateByMonth)
        expect(
            screen
                .getAllByTestId('fake-point')
                .every(
                    (point) =>
                        point.tagName === 'rect' &&
                        point.getAttribute('fill') ===
                            PRECIPITATION_STYLE.palette[6]
                )
        ).toBe(true)

        rerender(
            <FakeVisualization
                visualization={linked(climateByMonth, {
                    dx: DATA_ITEM_IDS.temperature,
                })}
                width={600}
                height={400}
            />
        )

        expect(
            screen
                .getAllByTestId('fake-point')
                .every((point) => point.tagName === 'circle')
        ).toBe(true)
        expect(swatches()).toEqual([rgb(TEMPERATURE_STYLE.palette[5])])
    })

    it("colors each series by its data item's style, and the others by the color set", () => {
        draw(temperatureByMonth)
        const { palette } = TEMPERATURE_STYLE
        expect(swatches()).toEqual(
            [palette[3], palette[5], palette[7]].map(rgb)
        )
    })

    it('keeps the color set for series of org units, in the data item’s chart type', () => {
        draw(
            linked(savedItem('DemoVisInc1'), { dx: DATA_ITEM_IDS.temperature })
        )
        expect(swatches()).toEqual(
            COLOR_SETS.DEFAULT.slice(0, 4).map((color) => rgb(color))
        )
        expect(
            screen
                .getAllByTestId('fake-point')
                .every((point) => point.tagName === 'circle')
        ).toBe(true)
    })

    it('takes the color set for data items with no style of their own', () => {
        const { unmount } = draw(malariaColumns)
        expect(swatches()).toEqual([rgb(COLOR_SETS.DEFAULT[0])])
        unmount()

        /* One org unit for its series */
        draw(linked(savedItem('DemoVisInc1'), { ou: 'DemoSouth01' }))
        expect(swatches()).toEqual([rgb(COLOR_SETS.DEFAULT[0])])
    })

    it('keeps a fixed axis through links, marks what goes past it, and refits on demand', () => {
        const at = (ou: string) => (
            <FakeVisualization
                visualization={linked(climateByMonth, { ou })}
                width={600}
                height={400}
            />
        )
        const { rerender } = render(at('DemoSouth01'))
        const southTop = axisTop()
        expect(screen.getByTestId('fake-chart-axis-lock')).toHaveTextContent(
            'Follows data'
        )

        fireEvent.click(screen.getByTestId('fake-chart-axis-lock'))
        rerender(at('DemoEast001'))
        expect(axisTop()).toBe(southTop)
        expect(screen.queryAllByTestId('fake-overflow')).toEqual([])

        fireEvent.click(screen.getByTestId('fake-chart-axis-refit'))
        const eastTop = axisTop()
        expect(eastTop).toBeLessThan(southTop)
        rerender(at('DemoSouth01'))
        expect(screen.getAllByTestId('fake-overflow').length).toBeGreaterThan(0)

        fireEvent.click(screen.getByTestId('fake-chart-axis-lock'))
        expect(axisTop()).toBe(southTop)
    })

    it('marks the points of a line past a fixed axis too', () => {
        const at = (ou: string) => (
            <FakeVisualization
                visualization={linked(ancVisits, { ou })}
                width={600}
                height={400}
            />
        )
        const { rerender } = render(at('DemoChS0101'))
        fireEvent.click(screen.getByTestId('fake-chart-axis-lock'))
        /* The whole country's visits pass one chiefdom's top */
        rerender(at('DemoLand001'))

        expect(screen.getAllByTestId('fake-overflow').length).toBeGreaterThan(0)
    })

    it('starts another data item on its own axis, the lock kept', () => {
        const { rerender } = draw(climateByMonth)
        fireEvent.click(screen.getByTestId('fake-chart-axis-lock'))
        const rainTop = axisTop()

        rerender(
            <FakeVisualization
                visualization={linked(climateByMonth, {
                    dx: DATA_ITEM_IDS.temperature,
                })}
                width={600}
                height={400}
            />
        )

        expect(axisTop()).toBeLessThan(rainTop)
        expect(screen.getByTestId('fake-chart-axis-lock')).toHaveTextContent(
            'Fixed'
        )
    })
})
