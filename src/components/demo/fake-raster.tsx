import type { DemoRaster } from '@modules/demo/map-layer'
import { memo, useId, useMemo } from 'react'
import classes from './styles/fake-map.module.css'

/* A raster layer's month, as Maps draws its images: square cells, a little
 * see-through over the basemap, cut to the layer's org units (`area`). With
 * a selection (`focus`, the outlines of the units the highlight names), the
 * raster fades outside them and keeps its strength within, so the place
 * shows on the raster itself. Kept as it is while the pointer moves. */
export const FakeRaster = memo(
    function FakeRaster({
        raster: { cellSize, cells },
        area,
        focus,
    }: {
        raster: DemoRaster
        /* SVG paths in the plane */
        area: string[]
        focus: string[]
    }) {
        const areaId = useId()
        const clipId = useId()
        const drawn = useMemo(
            () =>
                cells.map(({ at: [x, y], color }) => (
                    <rect
                        key={`${x},${y}`}
                        x={x - cellSize / 2}
                        y={y - cellSize / 2}
                        width={cellSize}
                        height={cellSize}
                        fill={color}
                    />
                )),
            [cells, cellSize]
        )

        const areaClip = (
            <clipPath id={areaId}>
                {area.map((path) => (
                    <path key={path} d={path} />
                ))}
            </clipPath>
        )
        if (!focus.length) {
            return (
                <g data-test="fake-raster">
                    {areaClip}
                    <g className={classes.raster} clipPath={`url(#${areaId})`}>
                        {drawn}
                    </g>
                </g>
            )
        }
        return (
            <g data-test="fake-raster">
                {areaClip}
                <clipPath id={clipId}>
                    {focus.map((path) => (
                        <path key={path} d={path} />
                    ))}
                </clipPath>
                <g
                    className={`${classes.raster} ${classes.rasterFaded}`}
                    clipPath={`url(#${areaId})`}
                >
                    {drawn}
                </g>
                <g
                    className={classes.raster}
                    clipPath={`url(#${clipId})`}
                    data-test="fake-raster-focus"
                >
                    {drawn}
                </g>
            </g>
        )
    },
    /* The same outlines in a new list each render: compared by value */
    (before, after) =>
        before.raster === after.raster &&
        before.area.join() === after.area.join() &&
        before.focus.join() === after.focus.join()
)
