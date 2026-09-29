import type { DemoTable } from '@modules/demo/analytics'
import type { FC } from 'react'
import type { PointHandlers } from './fake-chart'
import classes from './styles/fake-visualization.module.css'

/* A pivot table: the series across, the categories down */
export const FakePivotTable: FC<PointHandlers & { table: DemoTable }> = ({
    table,
    onPointClick,
    isDimmed,
}) => (
    <div className={classes.tableScroller}>
        <table className={classes.table} data-test="fake-table">
            <thead>
                <tr>
                    <th />
                    {table.series.map((item) => (
                        <th key={item.id} scope="col">
                            {item.name}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {table.categories.map((category) => (
                    <tr key={category.id}>
                        <th scope="row">{category.name}</th>
                        {table.series.map((item) => (
                            <td
                                key={item.id}
                                className={
                                    isDimmed(item, category)
                                        ? classes.dimmed
                                        : undefined
                                }
                                data-test="fake-point"
                                onClick={(event) =>
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
