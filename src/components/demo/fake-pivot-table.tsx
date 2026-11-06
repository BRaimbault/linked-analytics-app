import type { AxisItem, DemoTable } from '@modules/demo/analytics'
import type { CSSProperties, FC } from 'react'
import type { PointHandlers } from './fake-chart'
import classes from './styles/fake-visualization.module.css'

const legendStyle = (
    table: DemoTable,
    series: AxisItem,
    category: AxisItem
): CSSProperties | undefined => {
    const color = table.legendColorOf(series, category)
    if (!color) {
        return undefined
    }
    return table.legendStyle === 'TEXT' ? { color } : { backgroundColor: color }
}

/* A pivot table: the series across, the categories down. Its headers are
 * clicked like its cells: a row's header picks the row, a column's the
 * column. A header the highlight marks is bold, as a chart's label. */
export const FakePivotTable: FC<PointHandlers & { table: DemoTable }> = ({
    table,
    onPointClick,
    onLabelClick,
    isDimmed,
    isMarked,
}) => {
    const labelClass = (item: AxisItem) =>
        isMarked(item)
            ? `${classes.label} ${classes.markedCategory}`
            : classes.label
    return (
        <div className={classes.tableScroller}>
            <table className={classes.table} data-test="fake-table">
                <thead>
                    <tr>
                        <th />
                        {table.series.map((item) => (
                            <th
                                key={item.id}
                                scope="col"
                                className={labelClass(item)}
                                data-test="fake-label"
                                onClick={(event) => onLabelClick(item, event)}
                                onContextMenu={(event) =>
                                    onLabelClick(item, event)
                                }
                            >
                                {item.name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {table.categories.map((category) => (
                        <tr key={category.id}>
                            <th
                                scope="row"
                                className={labelClass(category)}
                                data-test="fake-label"
                                onClick={(event) =>
                                    onLabelClick(category, event)
                                }
                                onContextMenu={(event) =>
                                    onLabelClick(category, event)
                                }
                            >
                                {category.name}
                            </th>
                            {table.series.map((item) => (
                                <td
                                    key={item.id}
                                    className={
                                        isDimmed(item, category)
                                            ? classes.dimmed
                                            : undefined
                                    }
                                    style={legendStyle(table, item, category)}
                                    data-test="fake-point"
                                    onClick={(event) =>
                                        onPointClick(item, category, event)
                                    }
                                    onContextMenu={(event) =>
                                        onPointClick(item, category, event)
                                    }
                                >
                                    {table
                                        .valueOf(item, category)
                                        ?.toLocaleString('en') ?? ''}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
