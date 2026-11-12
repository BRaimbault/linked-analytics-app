import i18n from '@dhis2/d2-i18n'
import { withRelatedItems } from '@modules/demo/highlight'
import type { MapFeature } from '@modules/demo/map-layer'
import { getHierarchyName, getOrgUnit } from '@modules/demo/org-units'
import type { Shape } from '@modules/demo/shapes'
import {
    isHighlighted,
    type DataClick,
    type PluginProps,
} from '@modules/plugins/contract'
import type { MapObject } from '@modules/visualization/analytical-object'
import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type FC,
    type MouseEvent,
} from 'react'
import { toClickOptions } from './click-options'
import { FakeBasemap } from './fake-basemap'
import { FakeMapLegend } from './fake-map-legend'
import { FakeMapZoom } from './fake-map-zoom'
import { FakeRaster } from './fake-raster'
import { PeriodNotices } from './period-notices'
import classes from './styles/fake-map.module.css'
import { useLegendLock } from './use-legend-lock'
import { useMapView } from './use-map-view'
import { useRasterLayer } from './use-raster-layer'

/* The demo's shapes lie in a 0-100 plane; the map shows it all at first */
const PLANE = 100
const HEADER_HEIGHT = 48
/* Room around the whole map, which zooming out also ends at */
const MARGIN = 16
/* A label's size and halo, in pixels on screen */
const LABEL_SIZE = 12
const LABEL_HALO = 3

const toPath = (shape: Shape) =>
    shape
        .map((ring) => `M${ring.map(([x, y]) => `${x},${y}`).join('L')}Z`)
        .join('')

const toDataClick = (
    { orgUnit }: MapFeature,
    dataItem: { id: string; name: string } | null
): DataClick => ({
    ou: {
        id: orgUnit.id,
        name: orgUnit.name,
        path: orgUnit.path,
        level: orgUnit.levelId,
    },
    ...(dataItem && { dx: dataItem }),
})

/* Stands in for Maps, with the props of the proposed plugin contract: it
 * draws the map's thematic or raster layer from the demo's data, with a
 * legend, sends a clicked feature's org unit (and a thematic layer's data
 * item) through onDataClick, dims what highlight leaves out, and calls
 * onLoadingComplete once drawn. It keeps its own zoom and pan, also when
 * the map object changes, as the proposed contract asks. */
export const FakeMap: FC<PluginProps<MapObject>> = ({
    visualization,
    width,
    height,
    onDataClick,
    highlight,
    onLoadingComplete,
}) => {
    const thematic = visualization.mapViews.find(
        ({ layer }) => layer === 'thematic'
    )
    /* How Maps saves a raster layer */
    const rasterView = visualization.mapViews.find(
        ({ layer }) => layer === 'earthEngine'
    )
    const { layer: thematicLayer, ...legendLock } = useLegendLock(
        thematic,
        visualization.id
    )
    const rasterLayer = useRasterLayer(rasterView)
    const layer = thematicLayer ?? rasterLayer
    const [hoveredId, setHoveredId] = useState<string | null>(null)
    const shownHighlight = useMemo(
        () => withRelatedItems(highlight),
        [highlight]
    )

    useEffect(() => {
        onLoadingComplete?.()
    }, [layer, onLoadingComplete])

    const mapHeight = Math.max(0, height - HEADER_HEIGHT)
    /* Screen pixels per plane unit at zoom 1 */
    const fit = Math.max(0, Math.min(width, mapHeight) - 2 * MARGIN) / PLANE
    const { view, canvasRef, canvasHandlers, isClick, ...zoom } = useMapView({
        fit,
        hasCanvas: layer !== null,
    })

    const rootRef = useRef<HTMLDivElement>(null)
    const onFeatureClick = (feature: MapFeature, event: MouseEvent) => {
        if (isClick() && layer) {
            onDataClick?.(
                toDataClick(feature, layer.dataItem),
                toClickOptions(event, rootRef.current as HTMLElement)
            )
        }
    }

    if (!layer) {
        return <p className={classes.empty}>{i18n.t('No layer to show')}</p>
    }

    const hoveredFeature = layer.features.find(
        (feature) => feature.orgUnit.id === hoveredId
    )

    /* The units the highlight names are the selection, outlined as they
     * are: a chiefdom picked on a map of districts is outlined itself,
     * within its district */
    const selection = (highlight?.ou ?? []).flatMap((id) => {
        const unit = getOrgUnit(id)
        const isOnMap =
            unit &&
            layer.features.some(
                ({ orgUnit }) =>
                    orgUnit.path.startsWith(unit.path) ||
                    unit.path.startsWith(orgUnit.path)
            )
        return isOnMap ? [unit] : []
    })

    /* Centred, then zoomed about the centre and panned */
    const scale = fit * view.zoom
    const transform = [
        `translate(${width / 2} ${mapHeight / 2})`,
        `scale(${scale})`,
        `translate(${view.x - PLANE / 2} ${view.y - PLANE / 2})`,
    ].join(' ')

    return (
        <div ref={rootRef} className={classes.map} data-test="fake-map">
            <div className={classes.header}>
                <div className={classes.title}>{visualization.name}</div>
                <div className={classes.subtitle}>
                    {[layer.name, ...layer.periodNames]
                        .filter(Boolean)
                        .join(' · ')}
                </div>
            </div>
            <PeriodNotices
                notices={layer.notices}
                className={classes.notices}
            />
            <svg
                width={width}
                height={mapHeight}
                className={classes.canvas}
                role="img"
                aria-label={visualization.name}
                ref={canvasRef}
                {...canvasHandlers}
            >
                <g transform={transform} data-test="fake-map-plane">
                    <FakeBasemap />
                    {layer.raster && (
                        <FakeRaster
                            raster={layer.raster}
                            area={layer.features.map(({ orgUnit }) =>
                                toPath(orgUnit.shape)
                            )}
                            focus={selection.map(({ shape }) => toPath(shape))}
                        />
                    )}
                    {layer.features.map((feature) => (
                        <path
                            key={feature.orgUnit.id}
                            d={toPath(feature.orgUnit.shape)}
                            fill={feature.color}
                            className={[
                                layer.raster
                                    ? classes.boundary
                                    : classes.feature,
                                !isHighlighted(
                                    shownHighlight,
                                    toDataClick(feature, layer.dataItem)
                                ) && classes.dimmed,
                            ]
                                .filter(Boolean)
                                .join(' ')}
                            data-test="fake-feature"
                            onClick={(event) => onFeatureClick(feature, event)}
                            onContextMenu={(event) =>
                                onFeatureClick(feature, event)
                            }
                            onPointerEnter={() =>
                                setHoveredId(feature.orgUnit.id)
                            }
                            onPointerLeave={() => setHoveredId(null)}
                        >
                            <title>
                                {`${getHierarchyName(feature.orgUnit)}: ${
                                    feature.value?.toLocaleString('en') ??
                                    i18n.t('No value')
                                }`}
                            </title>
                        </path>
                    ))}
                    {layer.outlines.map((shape, index) => (
                        <path
                            key={index}
                            d={toPath(shape)}
                            className={classes.outline}
                        />
                    ))}
                    {/* Last, so neighbours and outlines don't cover them */}
                    {selection.map((unit) => (
                        <path
                            key={unit.id}
                            d={toPath(unit.shape)}
                            className={classes.selection}
                            data-test="fake-feature-selection"
                        />
                    ))}
                    {hoveredFeature && (
                        <path
                            d={toPath(hoveredFeature.orgUnit.shape)}
                            className={classes.hover}
                            data-test="fake-feature-hover"
                        />
                    )}
                    {/* Names keep their size on screen as the map zooms,
                     * as Maps' labels do */}
                    {layer.features.map(
                        ({ orgUnit, label, labelAt: [x, y] }) =>
                            label && (
                                <text
                                    key={orgUnit.id}
                                    x={x}
                                    y={y}
                                    fontSize={LABEL_SIZE / scale}
                                    strokeWidth={LABEL_HALO / scale}
                                    className={classes.featureLabel}
                                    data-test="fake-feature-label"
                                >
                                    {label}
                                </text>
                            )
                    )}
                </g>
            </svg>
            <FakeMapLegend
                entries={layer.legend}
                unit={layer.unit}
                {...legendLock}
            />
            <FakeMapZoom {...zoom} />
        </div>
    )
}
