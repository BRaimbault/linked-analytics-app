import i18n from '@dhis2/d2-i18n'
import { buildDemoTable, toDataClick } from '@modules/demo/analytics'
import { isHighlighted, type PluginProps } from '@modules/plugins/contract'
import type { VisualizationObject } from '@modules/visualization/analytical-object'
import { useEffect, useMemo, type FC } from 'react'
import { FakeChart, SERIES_COLORS, type PointHandlers } from './fake-chart'
import { FakePivotTable } from './fake-pivot-table'
import classes from './styles/fake-visualization.module.css'

/* The header above the chart: the name, what it's filtered by, and the
 * series' legend */
const HEADER_HEIGHT = 56

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

    useEffect(() => {
        onLoadingComplete?.()
    }, [table, onLoadingComplete])

    const handlers: PointHandlers = {
        onPointClick: (item, category, event) =>
            onDataClick?.(toDataClick(item, category), {
                additive: event.ctrlKey || event.metaKey,
            }),
        isDimmed: (item, category) =>
            !isHighlighted(highlight, toDataClick(item, category)),
    }
    const filteredBy = table.filters
        .map((items) => items.map(({ name }) => name).join(', '))
        .join(' · ')

    return (
        <div className={classes.visualization} data-test="fake-visualization">
            <div className={classes.header}>
                <div className={classes.title}>{visualization.name}</div>
                {filteredBy && (
                    <div className={classes.subtitle}>{filteredBy}</div>
                )}
                {visualization.type !== 'PIVOT_TABLE' && (
                    <ul className={classes.legend}>
                        {table.series.map((item, index) => (
                            <li key={item.id}>
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
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {!table.series.length || !table.categories.length ? (
                <p className={classes.empty}>{i18n.t('No data to show')}</p>
            ) : visualization.type === 'PIVOT_TABLE' ? (
                <FakePivotTable table={table} {...handlers} />
            ) : (
                <FakeChart
                    table={table}
                    kind={visualization.type}
                    width={width}
                    height={Math.max(0, height - HEADER_HEIGHT)}
                    {...handlers}
                />
            )}
        </div>
    )
}
