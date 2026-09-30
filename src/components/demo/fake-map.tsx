import i18n from '@dhis2/d2-i18n'
import { IconAdd16, IconHome16, IconSubtract16 } from '@dhis2/ui'
import { withRelatedOrgUnits } from '@modules/demo/highlight'
import type { MapFeature } from '@modules/demo/map-layer'
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
import { FakeMapLegend } from './fake-map-legend'
import { PeriodNotices } from './period-notices'
import classes from './styles/fake-map.module.css'
import { useLegendLock } from './use-legend-lock'
import { useMapView } from './use-map-view'

/* The demo's shapes lie in a 0-100 plane; the map shows it all at first */
const PLANE = 100
const HEADER_HEIGHT = 44
/* Room around the whole map, which zooming out also ends at */
const MARGIN = 16

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
 * draws the map's thematic layer from the demo's data, with a legend,
 * sends a clicked feature's org unit (and the layer's data item) through
 * onDataClick, dims what highlight leaves out, and calls onLoadingComplete
 * once drawn. It keeps its own zoom and pan, also when the map object
 * changes, as the proposed contract asks. */
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
    const { layer, ...legendLock } = useLegendLock(thematic, visualization.id)
    const [hoveredId, setHoveredId] = useState<string | null>(null)
    const shownHighlight = useMemo(
        () => withRelatedOrgUnits(highlight),
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

    /* With a highlight, the features it keeps are the selection */
    const selectedFeatures = shownHighlight
        ? layer.features.filter((feature) =>
              isHighlighted(
                  shownHighlight,
                  toDataClick(feature, layer.dataItem)
              )
          )
        : []

    /* Centred, then zoomed about the centre and panned */
    const transform = [
        `translate(${width / 2} ${mapHeight / 2})`,
        `scale(${fit * view.zoom})`,
        `translate(${view.x - PLANE / 2} ${view.y - PLANE / 2})`,
    ].join(' ')

    return (
        <div ref={rootRef} className={classes.map} data-test="fake-map">
            <div className={classes.header}>
                <div className={classes.title}>{visualization.name}</div>
                <div className={classes.subtitle}>
                    {[layer.dataItem?.name, ...layer.periodNames]
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
                    {layer.features.map((feature) => (
                        <path
                            key={feature.orgUnit.id}
                            d={toPath(feature.orgUnit.shape)}
                            fill={feature.color}
                            className={
                                isHighlighted(
                                    shownHighlight,
                                    toDataClick(feature, layer.dataItem)
                                )
                                    ? classes.feature
                                    : `${classes.feature} ${classes.dimmed}`
                            }
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
                                {`${feature.orgUnit.name}: ${
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
                    {selectedFeatures.map((feature) => (
                        <path
                            key={feature.orgUnit.id}
                            d={toPath(feature.orgUnit.shape)}
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
                </g>
            </svg>
            <FakeMapLegend entries={layer.legend} {...legendLock} />
            <div className={classes.zoom}>
                {[
                    {
                        label: i18n.t('Zoom in'),
                        icon: <IconAdd16 />,
                        dataTest: 'fake-map-zoom-in',
                        onClick: zoom.zoomIn,
                    },
                    {
                        label: i18n.t('Zoom out'),
                        icon: <IconSubtract16 />,
                        dataTest: 'fake-map-zoom-out',
                        onClick: zoom.zoomOut,
                    },
                    {
                        label: i18n.t('Whole map'),
                        icon: <IconHome16 />,
                        dataTest: 'fake-map-reset',
                        onClick: zoom.showWholeMap,
                    },
                ].map(({ label, icon, dataTest, onClick }) => (
                    <button
                        key={dataTest}
                        type="button"
                        className={classes.zoomButton}
                        aria-label={label}
                        title={label}
                        data-test={dataTest}
                        onClick={onClick}
                    >
                        {icon}
                    </button>
                ))}
            </div>
        </div>
    )
}
