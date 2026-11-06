import { BASEMAP } from '@modules/demo/basemap'
import type { Point } from '@modules/demo/land-grid'
import {
    getOrgUnit,
    ROOT_ORG_UNIT_ID,
    type DemoOrgUnit,
} from '@modules/demo/org-units'
import type { FC } from 'react'
import classes from './styles/fake-map.module.css'

const toLine = (points: Point[]) =>
    points.map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${y}`).join(' ')

const ISLAND = (getOrgUnit(ROOT_ORG_UNIT_ID) as DemoOrgUnit).shape

/* The land and water around the island and under it, in the pale colors
 * of a light basemap, under the data layer; names in plane units, so they
 * grow as the map zooms in, as a basemap's labels do */
export const FakeBasemap: FC = () => {
    const { continent } = BASEMAP
    return (
        <g aria-hidden="true" data-test="fake-basemap">
            <path d={`${toLine(continent.ring)} Z`} className={classes.land} />
            <path
                d={ISLAND.map((ring) => `${toLine(ring)} Z`).join(' ')}
                className={classes.land}
                data-test="fake-basemap-island"
            />
            {BASEMAP.rivers.map((river) => (
                <path
                    key={river.join()}
                    d={toLine(river)}
                    className={classes.river}
                />
            ))}
            {BASEMAP.roads.map((road) => (
                <path
                    key={road.join()}
                    d={toLine(road)}
                    className={classes.road}
                />
            ))}
            {BASEMAP.towns.map(({ name, at: [x, y], labelLeft }) => (
                <g key={name}>
                    <circle cx={x} cy={y} r={0.9} className={classes.town} />
                    <text
                        x={labelLeft ? x - 1.8 : x + 1.8}
                        y={y + 1}
                        textAnchor={labelLeft ? 'end' : 'start'}
                        className={classes.townLabel}
                    >
                        {name}
                    </text>
                </g>
            ))}
            <text
                x={continent.labelAt[0]}
                y={continent.labelAt[1]}
                className={classes.landLabel}
            >
                {continent.name}
            </text>
            {BASEMAP.waters.map(({ name, at: [x, y] }) => (
                <text key={name} x={x} y={y} className={classes.waterLabel}>
                    {name}
                </text>
            ))}
        </g>
    )
}
