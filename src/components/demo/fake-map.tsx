import i18n from '@dhis2/d2-i18n'
import { IconAdd16, IconHome16, IconSubtract16 } from '@dhis2/ui'
import { buildDemoMapLayer, type MapFeature } from '@modules/demo/map-layer'
import type { Ring } from '@modules/demo/org-units'
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
    type PointerEvent,
} from 'react'
import classes from './styles/fake-map.module.css'

/* The demo's shapes lie in a 0-100 plane; the map shows it all at first */
const PLANE = 100
const HEADER_HEIGHT = 44
const ZOOM_STEP = 1.25
const MIN_ZOOM = 1
const MAX_ZOOM = 8
/* A pointer that moves less than this between down and up clicks */
const CLICK_SLOP = 4

type View = { zoom: number; x: number; y: number }
const WHOLE_MAP: View = { zoom: 1, x: 0, y: 0 }

const toPath = (ring: Ring) =>
    `M${ring.map(([x, y]) => `${x},${y}`).join('L')}Z`

const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))

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
    const layer = useMemo(
        () => (thematic ? buildDemoMapLayer(thematic) : null),
        [thematic]
    )
    const [view, setView] = useState<View>(WHOLE_MAP)
    const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)

    useEffect(() => {
        onLoadingComplete?.()
    }, [layer, onLoadingComplete])

    const mapHeight = Math.max(0, height - HEADER_HEIGHT)
    /* Screen pixels per plane unit at zoom 1 */
    const fit = Math.min(width, mapHeight) / PLANE
    const zoomBy = (factor: number) =>
        setView((current) => ({
            ...current,
            zoom: clampZoom(current.zoom * factor),
        }))

    /* The wheel zooms the map instead of scrolling the page: React's wheel
     * listeners are passive and can't stop the scroll, so this one is
     * added by hand */
    const canvasRef = useRef<SVGSVGElement>(null)
    const hasCanvas = layer !== null
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) {
            return
        }
        const onWheel = (event: WheelEvent) => {
            event.preventDefault()
            zoomBy(event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP)
        }
        canvas.addEventListener('wheel', onWheel, { passive: false })
        return () => canvas.removeEventListener('wheel', onWheel)
    }, [hasCanvas])
    const onPointerDown = (event: PointerEvent) => {
        drag.current = { x: event.clientX, y: event.clientY, moved: false }
    }
    const onPointerMove = (event: PointerEvent) => {
        const start = drag.current
        /* Only while the primary button is down */
        if (!start || !(event.buttons & 1)) {
            return
        }
        const dx = event.clientX - start.x
        const dy = event.clientY - start.y
        if (Math.abs(dx) + Math.abs(dy) >= CLICK_SLOP) {
            start.moved = true
        }
        if (start.moved) {
            drag.current = { x: event.clientX, y: event.clientY, moved: true }
            setView((current) => ({
                ...current,
                x: current.x + dx / (fit * current.zoom),
                y: current.y + dy / (fit * current.zoom),
            }))
        }
    }
    /* A press that didn't move ends now; one that dragged ends after the
     * click that follows it, which must not count as a feature click */
    const onPointerUp = () => {
        if (drag.current?.moved) {
            setTimeout(() => {
                drag.current = null
            })
        } else {
            drag.current = null
        }
    }
    const onFeatureClick = (feature: MapFeature, event: MouseEvent) => {
        const wasDrag = drag.current?.moved
        drag.current = null
        if (!wasDrag && layer) {
            onDataClick?.(toDataClick(feature, layer.dataItem), {
                additive: event.ctrlKey || event.metaKey,
            })
        }
    }

    if (!layer) {
        return <p className={classes.empty}>{i18n.t('No layer to show')}</p>
    }

    /* Centred, then zoomed about the centre and panned */
    const transform = [
        `translate(${width / 2} ${mapHeight / 2})`,
        `scale(${fit * view.zoom})`,
        `translate(${view.x - PLANE / 2} ${view.y - PLANE / 2})`,
    ].join(' ')

    return (
        <div className={classes.map} data-test="fake-map">
            <div className={classes.header}>
                <div className={classes.title}>{visualization.name}</div>
                <div className={classes.subtitle}>
                    {[layer.dataItem?.name, ...layer.periodNames]
                        .filter(Boolean)
                        .join(' · ')}
                </div>
            </div>
            <svg
                width={width}
                height={mapHeight}
                className={classes.canvas}
                role="img"
                aria-label={visualization.name}
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
            >
                <g transform={transform} data-test="fake-map-plane">
                    {layer.features.map((feature) => (
                        <path
                            key={feature.orgUnit.id}
                            d={toPath(feature.orgUnit.shape)}
                            fill={feature.color}
                            className={
                                isHighlighted(
                                    highlight,
                                    toDataClick(feature, layer.dataItem)
                                )
                                    ? classes.feature
                                    : `${classes.feature} ${classes.dimmed}`
                            }
                            data-test="fake-feature"
                            onClick={(event) => onFeatureClick(feature, event)}
                        >
                            <title>
                                {`${feature.orgUnit.name}: ${
                                    feature.value?.toLocaleString('en') ??
                                    i18n.t('No value')
                                }`}
                            </title>
                        </path>
                    ))}
                    {layer.outlines.map((ring, index) => (
                        <path
                            key={index}
                            d={toPath(ring)}
                            className={classes.outline}
                        />
                    ))}
                </g>
            </svg>
            <ul className={classes.legend} data-test="fake-map-legend">
                {layer.legend.map(({ color, label }) => (
                    <li key={label}>
                        <span
                            className={classes.swatch}
                            style={{ background: color }}
                        />
                        {label}
                    </li>
                ))}
            </ul>
            <div className={classes.zoom}>
                {[
                    {
                        label: i18n.t('Zoom in'),
                        icon: <IconAdd16 />,
                        dataTest: 'fake-map-zoom-in',
                        onClick: () => zoomBy(ZOOM_STEP),
                    },
                    {
                        label: i18n.t('Zoom out'),
                        icon: <IconSubtract16 />,
                        dataTest: 'fake-map-zoom-out',
                        onClick: () => zoomBy(1 / ZOOM_STEP),
                    },
                    {
                        label: i18n.t('Whole map'),
                        icon: <IconHome16 />,
                        dataTest: 'fake-map-reset',
                        onClick: () => setView(WHOLE_MAP),
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
