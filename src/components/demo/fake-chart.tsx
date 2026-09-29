import type { AxisItem, DemoTable } from '@modules/demo/analytics'
import type { FC, MouseEvent } from 'react'
import classes from './styles/fake-visualization.module.css'

export const SERIES_COLORS = [
    '#2d9cdb',
    '#a8bf24',
    '#f2994a',
    '#9b51e0',
    '#27ae60',
]

const MARGIN = { top: 8, right: 12, left: 52 }
/* Room below the plot for the category names, more when they're turned */
const BOTTOM = { upright: 24, turned: 64 }
/* Five steps divide every nice top (NICE_STEPS) into round values */
const TICK_COUNT = 5
/* Beyond this many categories, their names are turned to fit */
const UPRIGHT_LABELS = 8

/* The round values the value axis may top out at, times a power of ten */
const NICE_STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]

/* A round top for the value axis, just above the largest value */
export const niceMax = (value: number): number => {
    if (value <= 0) {
        return 1
    }
    const power = 10 ** Math.floor(Math.log10(value))
    const step = NICE_STEPS.find((factor) => factor * power >= value)
    return (step as number) * power
}

/* The click handlers take right-clicks too; the event tells them apart. A
 * label (a category on the axis, a table's row or column header) is a
 * point with its own dimension alone. */
export type PointHandlers = {
    onPointClick: (
        series: AxisItem,
        category: AxisItem,
        event: MouseEvent
    ) => void
    onLabelClick: (item: AxisItem, event: MouseEvent) => void
    isDimmed: (series: AxisItem, category: AxisItem) => boolean
}

/* A column or line chart in plain SVG: plainly not DV, so a demo can't be
 * mistaken for the real app */
export const FakeChart: FC<
    PointHandlers & {
        table: DemoTable
        kind: 'COLUMN' | 'LINE'
        width: number
        height: number
    }
> = ({ table, kind, width, height, onPointClick, onLabelClick, isDimmed }) => {
    const { series, categories, valueOf } = table
    const turned = categories.length > UPRIGHT_LABELS
    const bottom = turned ? BOTTOM.turned : BOTTOM.upright
    const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right)
    const plotHeight = Math.max(0, height - MARGIN.top - bottom)
    const values = series.flatMap((item) =>
        categories.map((category) => valueOf(item, category) ?? 0)
    )
    const max = niceMax(Math.max(0, ...values))
    const y = (value: number) => MARGIN.top + plotHeight * (1 - value / max)
    const band = plotWidth / Math.max(1, categories.length)
    const bandLeft = (index: number) => MARGIN.left + band * index
    const barWidth = (band * 0.8) / Math.max(1, series.length)

    const point = (item: AxisItem, category: AxisItem) => ({
        className: isDimmed(item, category) ? classes.dimmed : undefined,
        onClick: (event: MouseEvent) => onPointClick(item, category, event),
        onContextMenu: (event: MouseEvent) =>
            onPointClick(item, category, event),
    })

    return (
        <svg
            width={width}
            height={height}
            className={classes.chart}
            data-test="fake-chart"
            role="img"
        >
            {Array.from({ length: TICK_COUNT + 1 }, (_, tick) => {
                const value = (max / TICK_COUNT) * tick
                return (
                    <g key={tick} className={classes.tick}>
                        <line
                            x1={MARGIN.left}
                            x2={MARGIN.left + plotWidth}
                            y1={y(value)}
                            y2={y(value)}
                        />
                        <text x={MARGIN.left - 6} y={y(value)} dy="0.32em">
                            {value.toLocaleString('en')}
                        </text>
                    </g>
                )
            })}
            {categories.map((category, index) => (
                <text
                    key={category.id}
                    className={classes.category}
                    transform={`translate(${bandLeft(index) + band / 2}, ${
                        MARGIN.top + plotHeight + 14
                    })${turned ? ' rotate(-35)' : ''}`}
                    textAnchor={turned ? 'end' : 'middle'}
                    data-test="fake-label"
                    onClick={(event) => onLabelClick(category, event)}
                    onContextMenu={(event) => onLabelClick(category, event)}
                >
                    {category.name}
                </text>
            ))}
            {series.map((item, seriesIndex) => {
                const color = SERIES_COLORS[seriesIndex % SERIES_COLORS.length]
                const points = categories.map((category, index) => ({
                    category,
                    x: bandLeft(index) + band / 2,
                    value: valueOf(item, category) ?? 0,
                }))
                if (kind === 'LINE') {
                    return (
                        <g key={item.id} data-test="fake-series">
                            <polyline
                                className={classes.line}
                                stroke={color}
                                points={points
                                    .map(({ x, value }) => `${x},${y(value)}`)
                                    .join(' ')}
                            />
                            {points.map(({ category, x, value }) => (
                                <circle
                                    key={category.id}
                                    cx={x}
                                    cy={y(value)}
                                    r={4}
                                    fill={color}
                                    data-test="fake-point"
                                    {...point(item, category)}
                                />
                            ))}
                        </g>
                    )
                }
                return (
                    <g key={item.id} data-test="fake-series">
                        {points.map(({ category, value }, index) => (
                            <rect
                                key={category.id}
                                x={
                                    bandLeft(index) +
                                    band * 0.1 +
                                    barWidth * seriesIndex
                                }
                                y={y(value)}
                                width={Math.max(0, barWidth - 1)}
                                height={MARGIN.top + plotHeight - y(value)}
                                fill={color}
                                data-test="fake-point"
                                {...point(item, category)}
                            />
                        ))}
                    </g>
                )
            })}
        </svg>
    )
}
