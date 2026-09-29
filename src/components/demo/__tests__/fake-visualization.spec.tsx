import { niceMax } from '@components/demo/fake-chart'
import { FakeVisualization } from '@components/demo/fake-visualization'
import { DEMO_VISUALIZATIONS } from '@modules/demo/saved-items'
import type { VisualizationObject } from '@modules/visualization/analytical-object'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const [ancLine, malariaColumns, pentaTable, ancByDistrict] = DEMO_VISUALIZATIONS

const draw = (
    visualization: VisualizationObject,
    props: Partial<Parameters<typeof FakeVisualization>[0]> = {}
) =>
    render(
        <FakeVisualization
            visualization={visualization}
            width={600}
            height={400}
            {...props}
        />
    )

describe('FakeVisualization', () => {
    it('draws a column chart, a bar per district, with its name and filter', () => {
        draw(malariaColumns)

        expect(screen.getAllByTestId('fake-point')).toHaveLength(4)
        expect(
            screen.getByText('Malaria cases by district, last 12 months')
        ).toBeInTheDocument()
        expect(screen.getByText('Last 12 months')).toBeInTheDocument()
        expect(
            screen.getByText('Malaria cases confirmed', { selector: 'li' })
        ).toBeInTheDocument()
    })

    it('draws a line chart, a point per month and series, names turned to fit', () => {
        draw(ancLine)

        expect(screen.getAllByTestId('fake-series')).toHaveLength(2)
        expect(screen.getAllByTestId('fake-point')).toHaveLength(24)
        expect(
            screen.getByText('August 2025').getAttribute('transform')
        ).toContain('rotate')
    })

    it('draws a line per district, whose points send the district and the month', () => {
        const onDataClick = vi.fn()
        draw(ancByDistrict, { onDataClick })

        expect(screen.getAllByTestId('fake-series')).toHaveLength(4)
        expect(screen.getAllByTestId('fake-point')).toHaveLength(48)
        expect(screen.getByText('West', { selector: 'li' })).toBeInTheDocument()

        /* West's line (the second), its first month */
        fireEvent.click(screen.getAllByTestId('fake-point')[12])

        expect(onDataClick).toHaveBeenCalledWith(
            {
                ou: {
                    id: 'DemoWest001',
                    name: 'West',
                    path: '/DemoLand001/DemoWest001',
                    level: 'DemoLevel02',
                },
                pe: { id: '202508', name: 'August 2025' },
            },
            { additive: false }
        )
    })

    it('draws a pivot table, the series across and the categories down', () => {
        draw(pentaTable)
        const table = screen.getByTestId('fake-table')

        expect(within(table).getAllByRole('columnheader')).toHaveLength(5)
        expect(within(table).getAllByRole('rowheader')).toHaveLength(14)
    })

    it('sends a clicked point’s ids, additive with Ctrl or Cmd', () => {
        const onDataClick = vi.fn()
        draw(malariaColumns, { onDataClick })
        const [north] = screen.getAllByTestId('fake-point')

        fireEvent.click(north)
        fireEvent.click(north, { metaKey: true })

        expect(onDataClick).toHaveBeenNthCalledWith(
            1,
            {
                dx: { id: 'DemoMalar01', name: 'Malaria cases confirmed' },
                ou: {
                    id: 'DemoNorth01',
                    name: 'North',
                    path: '/DemoLand001/DemoNorth01',
                    level: 'DemoLevel02',
                },
            },
            { additive: false }
        )
        expect(onDataClick).toHaveBeenLastCalledWith(expect.anything(), {
            additive: true,
        })
    })

    it('takes clicks on pivot cells too, and does nothing without a listener', () => {
        const onDataClick = vi.fn()
        const { unmount } = draw(pentaTable, { onDataClick })
        const [cell] = screen.getAllByTestId('fake-point')

        fireEvent.click(cell, { ctrlKey: true })
        expect(onDataClick).toHaveBeenCalledWith(
            expect.objectContaining({
                pe: expect.objectContaining({ id: '2025Q3' }),
            }),
            { additive: true }
        )
        unmount()

        draw(pentaTable)
        fireEvent.click(screen.getAllByTestId('fake-point')[0])
    })

    it('sends a right-click on a point or a cell with where it happened, and no browser menu', () => {
        const onDataClick = vi.fn()
        const { unmount } = draw(malariaColumns, { onDataClick })
        const [bar] = screen.getAllByTestId('fake-point')

        /* jsdom lays nothing out: the root is at the page's corner */
        const opened = fireEvent.contextMenu(bar, { clientX: 30, clientY: 40 })

        expect(opened).toBe(false)
        expect(onDataClick).toHaveBeenLastCalledWith(
            expect.objectContaining({
                ou: expect.objectContaining({ id: 'DemoNorth01' }),
            }),
            { additive: false, trigger: 'context', position: { x: 30, y: 40 } }
        )
        unmount()

        draw(pentaTable, { onDataClick })
        fireEvent.contextMenu(screen.getAllByTestId('fake-point')[0])
        expect(onDataClick).toHaveBeenLastCalledWith(
            expect.objectContaining({
                ou: expect.objectContaining({ id: 'DemoChN0101' }),
            }),
            expect.objectContaining({ trigger: 'context' })
        )
    })

    it('dims what the highlight leaves out, in charts and tables', () => {
        const dimmedPoints = () =>
            screen
                .getAllByTestId('fake-point')
                .map((point) => point.getAttribute('class') !== null)

        const { unmount } = draw(malariaColumns, {
            highlight: { ou: ['DemoEast001'] },
        })
        expect(dimmedPoints()).toEqual([true, true, false, true])
        unmount()

        draw(pentaTable, { highlight: { pe: ['2025Q3'] } })
        /* The first row: a cell per quarter, the first one kept */
        expect(dimmedPoints().slice(0, 4)).toEqual([false, true, true, true])
    })

    it('leaves a pivot cell empty where the demo has no value', () => {
        /* A data item the demo doesn't have */
        draw({
            ...pentaTable,
            filters: [{ dimension: 'dx', items: [{ id: 'nope' }] }],
        })

        expect(screen.getAllByTestId('fake-point')[0]).toBeEmptyDOMElement()
    })

    it('says when it has finished drawing, and again for a new object', () => {
        const onLoadingComplete = vi.fn()
        const { rerender } = draw(malariaColumns, { onLoadingComplete })
        expect(onLoadingComplete).toHaveBeenCalledTimes(1)

        rerender(
            <FakeVisualization
                visualization={ancLine}
                width={600}
                height={400}
                onLoadingComplete={onLoadingComplete}
            />
        )

        expect(onLoadingComplete).toHaveBeenCalledTimes(2)
    })

    it('says so when there is nothing to draw', () => {
        draw({ ...malariaColumns, rows: [] })

        expect(screen.getByText('No data to show')).toBeInTheDocument()
    })

    it('keeps a missing value at zero, and fits in a tiny view', () => {
        draw(
            {
                ...malariaColumns,
                filters: [{ dimension: 'pe', items: [{ id: '1999' }] }],
            },
            { width: 10, height: 10 }
        )

        expect(screen.getAllByTestId('fake-point')[0]).toHaveAttribute(
            'height',
            '0'
        )
    })

    it('tops the value axis with a round number just above the largest', () => {
        expect(niceMax(0)).toBe(1)
        expect(niceMax(2080)).toBe(2500)
        expect(niceMax(21000)).toBe(25000)
        expect(niceMax(95)).toBe(100)
        expect(niceMax(10)).toBe(10)
    })
})
