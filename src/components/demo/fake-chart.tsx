import type { AxisItem, DemoTable } from '@modules/demo/analytics'
import type { FC, MouseEvent } from 'react'
import classes from './styles/fake-visualization.module.css'
import { fitAxis } from './value-axis'

const MARGIN = { top: 8, right: 12, left: 52 }
/* Room below the plot for the category names, more when they're turned */
const BOTTOM = { upright: 24, turned: 64 }
/* Five steps divide every nice top (value-axis.ts) into round values */
const TICK_COUNT = 5
/* Beyond this many categories, their names are turned to fit */
const UPRIGHT_LABELS = 8

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
    /* A category the highlight names itself, such as a month */
    isMarked: (category: AxisItem) => boolean
}

/* Where a value goes past a fixed axis: a small arrow at the top */
const OverflowMark: FC<{ x: number; top: number }> = ({ x, top }) => (
    <path
        className={classes.overflow}
        d={`M${x - 5},${top + 6} L${x},${top} L${x + 5},${top + 6} Z`}
        data-test="fake-overflow"
    />
)

/* A column or line chart in plain SVG: plainly not DV, so a demo can't be
 * mistaken for the real app. With a highlight, what it leaves out fades: a
 * line chart fades the whole line of a series left out, and marks a
 * highlighted category with a dashed line across the plot, as a Highcharts
 * plot line does. */
export const FakeChart: FC<
    PointHandlers & {
        table: DemoTable
        kind: 'COLUMN' | 'LINE'
        /* A series' color, by its place among the series */
        colorOf: (index: number) => string
        /* The top of a fixed value axis; without it, it fits the values */
        axisMax?: number
        width: number
        height: number
    }
> = ({
    table,
    kind,
    colorOf,
    axisMax,
    width,
    height,
    onPointClick,
    onLabelClick,
    isDimmed,
    isMarked,
}) => {
    const { series, categories, valueOf } = table
    const turned = categories.length > UPRIGHT_LABELS
    const bottom = turned ? BOTTOM.turned : BOTTOM.upright
    const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right)
    const plotHeight = Math.max(0, height - MARGIN.top - bottom)
    const max = axisMax ?? fitAxis(table)
    /* A value above a fixed axis stops at its top, and is marked there */
    const y = (value: number) =>
        MARGIN.top + plotHeight * (1 - Math.min(value, max) / max)
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
            {kind === 'LINE' &&
                categories.map(
                    (category, index) =>
                        isMarked(category) && (
                            <line
                                key={category.id}
                                className={classes.categoryMark}
                                x1={bandLeft(index) + band / 2}
                                x2={bandLeft(index) + band / 2}
                                y1={MARGIN.top}
                                y2={MARGIN.top + plotHeight}
                                data-test="fake-category-mark"
                            />
                        )
                )}
            {categories.map((category, index) => (
                <text
                    key={category.id}
                    className={
                        isMarked(category)
                            ? `${classes.category} ${classes.markedCategory}`
                            : classes.category
                    }
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
                const color = colorOf(seriesIndex)
                const points = categories.map((category, index) => ({
                    category,
                    x: bandLeft(index) + band / 2,
                    value: valueOf(item, category) ?? 0,
                }))
                if (kind === 'LINE') {
                    /* A missing value breaks the line, and has no point */
                    const known = points.filter(
                        ({ category }) => valueOf(item, category) !== null
                    )
                    const runs = points
                        .reduce<(typeof points)[]>(
                            (all, current) => {
                                if (valueOf(item, current.category) === null) {
                                    return [...all, []]
                                }
                                all[all.length - 1].push(current)
                                return all
                            },
                            [[]]
                        )
                        .filter((run) => run.length)
                    const isLeftOut =
                        known.length > 0 &&
                        known.every(({ category }) => isDimmed(item, category))
                    return (
                        <g key={item.id} data-test="fake-series">
                            {runs.map((run) => (
                                <polyline
                                    key={run[0].category.id}
                                    className={
                                        isLeftOut
                                            ? `${classes.line} ${classes.dimmed}`
                                            : classes.line
                                    }
                                    stroke={color}
                                    points={run
                                        .map(
                                            ({ x, value }) => `${x},${y(value)}`
                                        )
                                        .join(' ')}
                                />
                            ))}
                            {known.map(({ category, x, value }) => (
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
                            {known.map(
                                ({ category, x, value }) =>
                                    value > max && (
                                        <OverflowMark
                                            key={category.id}
                                            x={x}
                                            top={MARGIN.top}
                                        />
                                    )
                            )}
                        </g>
                    )
                }
                const barLeft = (index: number) =>
                    bandLeft(index) + band * 0.1 + barWidth * seriesIndex
                return (
                    <g key={item.id} data-test="fake-series">
                        {points.map(({ category, value }, index) => (
                            <rect
                                key={category.id}
                                x={barLeft(index)}
                                y={y(value)}
                                width={Math.max(0, barWidth - 1)}
                                height={MARGIN.top + plotHeight - y(value)}
                                fill={color}
                                data-test="fake-point"
                                {...point(item, category)}
                            />
                        ))}
                        {points.map(
                            ({ category, value }, index) =>
                                value > max && (
                                    <OverflowMark
                                        key={category.id}
                                        x={barLeft(index) + barWidth / 2}
                                        top={MARGIN.top}
                                    />
                                )
                        )}
                    </g>
                )
            })}
        </svg>
    )
}
