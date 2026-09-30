import i18n from '@dhis2/d2-i18n'
import { buildDemoTable, toDataClick } from '@modules/demo/analytics'
import { withRelatedOrgUnits } from '@modules/demo/highlight'
import { isHighlighted, type PluginProps } from '@modules/plugins/contract'
import type { VisualizationObject } from '@modules/visualization/analytical-object'
import { useEffect, useMemo, useRef, type FC } from 'react'
import { toClickOptions } from './click-options'
import { FakeChart, SERIES_COLORS, type PointHandlers } from './fake-chart'
import { FakePivotTable } from './fake-pivot-table'
import { PeriodNotices } from './period-notices'
import classes from './styles/fake-visualization.module.css'

/* The header above the chart: the name, what it's filtered by, and the
 * series' legend */
const HEADER_HEIGHT = 56
/* A notice's line above the chart, as in period-notices.module.css */
const NOTICE_HEIGHT = 20

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
    const rootRef = useRef<HTMLDivElement>(null)
    const shownHighlight = useMemo(
        () => withRelatedOrgUnits(highlight),
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
                {visualization.type !== 'PIVOT_TABLE' && (
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
                                        style={{
                                            background:
                                                SERIES_COLORS[
                                                    index % SERIES_COLORS.length
                                                ],
                                        }}
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
                        <FakeChart
                            table={table}
                            kind={visualization.type}
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
