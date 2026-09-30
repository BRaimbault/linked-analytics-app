import {
    NO_PLUGIN_SOURCES,
    PluginSourcesProvider,
    type PluginSources,
} from '@components/plugins/plugin-sources'
import { PluginView } from '@components/plugins/plugin-view'
import { DEMO_VISUALIZATIONS } from '@modules/demo/saved-items'
import type { PluginProps } from '@modules/plugins/contract'
import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/* jsdom has no ResizeObserver: this one reports the sizes a test gives */
const observers: {
    callback: ResizeObserverCallback
    disconnect: ReturnType<typeof vi.fn>
}[] = []
class FakeResizeObserver {
    disconnect = vi.fn()
    constructor(callback: ResizeObserverCallback) {
        observers.push({ callback, disconnect: this.disconnect })
    }
    observe() {}
}
const resizeTo = (width: number, height: number) =>
    act(() =>
        observers
            .at(-1)
            ?.callback(
                [{ contentRect: { width, height } } as ResizeObserverEntry],
                {} as ResizeObserver
            )
    )

const Renderer = vi.fn(({ width, height }: PluginProps) => (
    <div data-test="renderer">
        {width}×{height}
    </div>
))

const sources: PluginSources = {
    ...NO_PLUGIN_SOURCES,
    renderers: { visualization: Renderer },
}

const [object] = DEMO_VISUALIZATIONS

describe('PluginView', () => {
    /* unstubGlobals restores it after each test */
    beforeEach(() => {
        vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    })

    it('mounts the plugin once its body has a size, and follows it', () => {
        const onLoadingComplete = vi.fn()
        render(
            <PluginSourcesProvider sources={sources}>
                <PluginView
                    type="visualization"
                    object={object}
                    onLoadingComplete={onLoadingComplete}
                />
            </PluginSourcesProvider>
        )
        expect(screen.queryByTestId('renderer')).toBeNull()

        resizeTo(400, 300)
        expect(screen.getByTestId('renderer')).toHaveTextContent('400×300')
        expect(Renderer.mock.lastCall?.[0]).toMatchObject({
            visualization: object,
            width: 400,
            height: 300,
            onLoadingComplete,
        })

        resizeTo(500, 300)
        expect(screen.getByTestId('renderer')).toHaveTextContent('500×300')
    })

    it('keeps the plugin as it is for the same size, and drops it without one', () => {
        render(
            <PluginSourcesProvider sources={sources}>
                <PluginView type="visualization" object={object} />
            </PluginSourcesProvider>
        )
        resizeTo(400, 300)
        const renders = Renderer.mock.calls.length

        resizeTo(400, 300)
        expect(Renderer).toHaveBeenCalledTimes(renders)

        /* A hidden view has no size */
        resizeTo(0, 0)
        expect(screen.queryByTestId('renderer')).toBeNull()
    })

    it('passes clicks on, a right-click’s position turned into the page’s', () => {
        const onDataClick = vi.fn()
        render(
            <PluginSourcesProvider sources={sources}>
                <PluginView
                    type="visualization"
                    object={object}
                    onDataClick={onDataClick}
                />
            </PluginSourcesProvider>
        )
        resizeTo(400, 300)
        vi.spyOn(
            screen.getByTestId('plugin-view'),
            'getBoundingClientRect'
        ).mockReturnValue({ left: 100, top: 50 } as DOMRect)
        const sendClick = Renderer.mock.lastCall?.[0].onDataClick
        const click = { ou: { id: 'DemoNorth01' } }

        act(() => sendClick?.(click, { additive: true }))
        act(() =>
            sendClick?.(click, {
                additive: false,
                trigger: 'context',
                position: { x: 10, y: 20 },
            })
        )

        expect(onDataClick).toHaveBeenNthCalledWith(1, click, {
            additive: true,
            position: undefined,
        })
        expect(onDataClick).toHaveBeenNthCalledWith(2, click, {
            additive: false,
            trigger: 'context',
            position: { x: 110, y: 70 },
        })
    })

    it('draws nothing for a type without a plugin, and stops observing when gone', () => {
        const { unmount } = render(<PluginView type="map" object={object} />)
        resizeTo(400, 300)

        expect(screen.getByTestId('plugin-view')).toBeEmptyDOMElement()
        unmount()
        expect(observers.at(-1)?.disconnect).toHaveBeenCalled()
    })
})
