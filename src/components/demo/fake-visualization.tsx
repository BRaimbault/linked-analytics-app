import { useElementSize } from '@components/plugins/use-element-size'
import i18n from '@dhis2/d2-i18n'
import { buildDemoTable, toDataClick } from '@modules/demo/analytics'
import { getChartStyle } from '@modules/demo/data-items'
import { isMarkedBy, withRelatedItems } from '@modules/demo/highlight'
import { isHighlighted, type PluginProps } from '@modules/plugins/contract'
import {
    getDimensionItemIds,
    type VisualizationObject,
} from '@modules/visualization/analytical-object'
import { useEffect, useMemo, useRef, type ComponentProps, type FC } from 'react'
import { toClickOptions } from './click-options'
import { FakeChart, type PointHandlers } from './fake-chart'
import { FakePivotTable } from './fake-pivot-table'
import { FakeScaleLock } from './fake-scale-lock'
import { PeriodNotices } from './period-notices'
import { seriesColor } from './series-colors'
import classes from './styles/fake-visualization.module.css'
import { useAxisLock } from './use-axis-lock'

/* The header above the chart: the name, what it's filtered by, and the
 * series' legend */
const HEADER_HEIGHT = 60
/* A notice's line above the chart, as in period-notices.module.css */
const NOTICE_HEIGHT = 20

/* The header grows when its legend wraps: the chart takes the room left,
 * once measured */
const MeasuredChart: FC<ComponentProps<typeof FakeChart>> = ({
    width,
    height,
    ...chart
}) => {
    const ref = useRef<HTMLDivElement>(null)
    const size = useElementSize(ref)
    return (
        <div ref={ref} className={classes.chart}>
            <FakeChart
                {...chart}
                width={size?.width ?? width}
                height={size?.height ?? height}
            />
        </div>
    )
}

/* Stands in for DV, with the props of the proposed plugin contract: it
 * draws the object it's given from the demo's data, sends a clicked
 * point's ids through onDataClick, dims what highlight leaves out, and
 * calls onLoadingComplete once drawn. */
export const FakeVisualization: FC<PluginProps<VisualizationObject>> = ({
    visualization,
    width,
    height,
    onDataClick,
    highlight,
    onLoadingComplete,
}) => {
    const table = useMemo(() => buildDemoTable(visualization), [visualization])
    const { axisMax, ...axisLock } = useAxisLock(table, visualization)
    const isChart = visualization.type !== 'PIVOT_TABLE'
    /* Data items draw in their own chart style, as the demo proposes
     * (data-items.ts, ChartStyle): one sets the chart's type, and its color
     * when it's the only series; several set their series' colors. Series
     * of org units or periods keep the color set, to tell them apart. */
    const dataItemIds = getDimensionItemIds(visualization, 'dx')
    const style =
        isChart && dataItemIds.length === 1
            ? getChartStyle(dataItemIds[0])
            : undefined
    const ownColor = (index: number) => {
        const item = table.series[index]
        if (item?.dimension === 'dx') {
            return getChartStyle(item.id)?.color
        }
        return table.series.length === 1 ? style?.color : undefined
    }
    const colorOf = (index: number) =>
        ownColor(index) ?? seriesColor(visualization.colorSet, index)
    const rootRef = useRef<HTMLDivElement>(null)
    const shownHighlight = useMemo(
        () => withRelatedItems(highlight),
        [highlight]
    )

    useEffect(() => {
        onLoadingComplete?.()
    }, [table, onLoadingComplete])

    const handlers: PointHandlers = {
        onPointClick: (item, category, event) =>
            onDataClick?.(
                toDataClick(item, category),
                toClickOptions(event, rootRef.current as HTMLElement)
            ),
        onLabelClick: (item, event) =>
            onDataClick?.(
                toDataClick(item),
                toClickOptions(event, rootRef.current as HTMLElement)
            ),
        isDimmed: (item, category) =>
            !isHighlighted(shownHighlight, toDataClick(item, category)),
        isMarked: (item) => isMarkedBy(highlight, item),
    }
    const hasValues = table.series.some((item) =>
        table.categories.some(
            (category) => table.valueOf(item, category) !== null
        )
    )
    const filteredBy = table.filters
        .map((items) => items.map(({ name }) => name).join(', '))
        .join(' · ')

    return (
        <div
            ref={rootRef}
            className={classes.visualization}
            data-test="fake-visualization"
        >
            <div className={classes.header}>
                <div className={classes.title}>{visualization.name}</div>
                {filteredBy && (
                    <div className={classes.subtitle}>{filteredBy}</div>
                )}
                {isChart && (
                    <FakeScaleLock
                        {...axisLock}
                        tooltips={{
                            locked: i18n.t(
                                'The axis stays as it is. Click to let it follow the data'
                            ),
                            unlocked: i18n.t(
                                'The axis follows the data. Click to keep it as it is'
                            ),
                            refit: i18n.t('Fit the axis to the data shown'),
                        }}
                        dataTest="fake-chart-axis"
                        className={classes.axisLock}
                    />
                )}
                {isChart && (
                    <ul className={classes.legend}>
                        {table.series.map((item, index) => (
                            <li key={item.id}>
                                <button
                                    type="button"
                                    className={classes.series}
                                    data-test="fake-legend-series"
                                    onClick={(event) =>
                                        handlers.onLabelClick(item, event)
                                    }
                                    onContextMenu={(event) =>
                                        handlers.onLabelClick(item, event)
                                    }
                                >
                                    <span
                                        className={classes.swatch}
                                        style={{ background: colorOf(index) }}
                                    />
                                    {item.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {!hasValues ? (
                <div className={classes.empty}>
                    <p>{i18n.t('No data to show')}</p>
                    <PeriodNotices notices={table.notices} />
                </div>
            ) : (
                <>
                    <PeriodNotices
                        notices={table.notices}
                        className={classes.notices}
                    />
                    {visualization.type === 'PIVOT_TABLE' ? (
                        <FakePivotTable table={table} {...handlers} />
                    ) : (
                        <MeasuredChart
                            table={table}
                            kind={style?.type ?? visualization.type}
                            colorOf={colorOf}
                            axisMax={axisMax}
                            width={width}
                            height={Math.max(
                                0,
                                height -
                                    HEADER_HEIGHT -
                                    NOTICE_HEIGHT * table.notices.length
                            )}
                            {...handlers}
                        />
                    )}
                </>
            )}
        </div>
    )
}
