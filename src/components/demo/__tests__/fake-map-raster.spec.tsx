import { FakeMap } from '@components/demo/fake-map'
import { DEMO_MAPS } from '@modules/demo/saved-items'
import type { MapObject } from '@modules/visualization/analytical-object'
import {
    readRasterLayerConfig,
    withRasterLayerConfig,
} from '@modules/visualization/raster-layer-config'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const climateMap = DEMO_MAPS.find(({ id }) => id === 'DemoMapClm1') as MapObject

/* The same map, its layer linked to a period's days */
const linkedTo = (startDate: string, endDate: string): MapObject => {
    const [view] = climateMap.mapViews
    const config = readRasterLayerConfig(view)
    return {
        ...climateMap,
        mapViews: [
            withRasterLayerConfig(view, {
                id: config?.id as string,
                period: { startDate, endDate },
            }),
        ],
    }
}

const draw = (map: MapObject, onDataClick = vi.fn()) =>
    render(
        <FakeMap
            visualization={map}
            width={500}
            height={400}
            onDataClick={onDataClick}
        />
    )

describe('FakeMap with a raster layer', () => {
    it('draws the month’s raster under the district boundaries, with the unit in its legend', () => {
        draw(climateMap)

        const raster = screen.getByTestId('fake-raster')
        expect(raster.querySelectorAll('rect').length).toBeGreaterThan(0)
        expect(screen.getAllByTestId('fake-feature')).toHaveLength(4)
        /* Cut to the boundaries, as Maps clips the image */
        expect(raster.querySelectorAll('clipPath path')).toHaveLength(4)
        expect(
            screen.getByText('Precipitation monthly ERA5 · July 2026')
        ).toBeInTheDocument()
        expect(screen.getByTestId('fake-map-legend')).toHaveTextContent(
            /^millimeter> 700/
        )
        /* Its classes are its style's: nothing to lock */
        expect(screen.queryByTestId('fake-map-lock')).toBeNull()
    })

    it('sends a clicked boundary’s org unit, and no data item', async () => {
        const onDataClick = vi.fn()
        draw(climateMap, onDataClick)

        await userEvent.click(screen.getAllByTestId('fake-feature')[0])

        expect(onDataClick).toHaveBeenCalledWith(
            { ou: expect.objectContaining({ id: 'DemoNorth01' }) },
            expect.anything()
        )
    })

    it('outlines the unit the highlight names, its raster kept bright and the rest faded', () => {
        const { rerender } = render(
            <FakeMap
                visualization={climateMap}
                width={500}
                height={400}
                highlight={{ ou: ['DemoChS0101'] }}
            />
        )
        /* A chiefdom, on a map of districts */
        expect(screen.getAllByTestId('fake-feature-selection')).toHaveLength(1)
        expect(screen.getByTestId('fake-raster-focus')).toBeInTheDocument()

        /* A district, on a map of its chiefdoms */
        const [view] = climateMap.mapViews
        rerender(
            <FakeMap
                visualization={{
                    ...climateMap,
                    mapViews: [
                        {
                            ...view,
                            rows: [
                                {
                                    dimension: 'ou',
                                    items: [
                                        { id: 'DemoSouth01' },
                                        { id: 'LEVEL-3' },
                                    ],
                                },
                            ],
                        },
                    ],
                }}
                width={500}
                height={400}
                highlight={{ ou: ['DemoSouth01'] }}
            />
        )
        expect(screen.getAllByTestId('fake-feature-selection')).toHaveLength(1)

        /* A unit the demo doesn't have */
        rerender(
            <FakeMap
                visualization={climateMap}
                width={500}
                height={400}
                highlight={{ ou: ['nope'] }}
            />
        )
        expect(screen.queryAllByTestId('fake-feature-selection')).toEqual([])
        expect(screen.queryByTestId('fake-raster-focus')).toBeNull()
    })

    it('keeps the month it showed for a period with no image of its own, and says why', () => {
        const { rerender } = draw(linkedTo('2026-03-01', '2026-03-31'))
        expect(
            screen.getByText('Precipitation monthly ERA5 · March 2026')
        ).toBeInTheDocument()

        rerender(
            <FakeMap
                visualization={linkedTo('2026-04-01', '2026-06-30')}
                width={500}
                height={400}
            />
        )

        expect(
            screen.getByText('Precipitation monthly ERA5 · March 2026')
        ).toBeInTheDocument()
        expect(screen.getByTestId('period-notices')).toHaveTextContent(
            'No quarterly values for Precipitation monthly ERA5'
        )
    })
})
