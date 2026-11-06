/* When plugin views finish drawing (the contract's onLoadingComplete), so
 * that play mode can wait for every view of its channel before its next
 * step */
export type PluginLoads = {
    reportLoaded: (viewId: string) => void
    /* Settles once each view given has drawn after the call, or after
     * `timeout` ms for one that never says (an older plugin, or one with
     * nothing new to draw) */
    waitForLoads: (viewIds: string[], timeout: number) => Promise<void>
}

export const createPluginLoads = (): PluginLoads => {
    const listeners = new Set<(viewId: string) => void>()
    return {
        reportLoaded: (viewId) => {
            for (const listener of [...listeners]) {
                listener(viewId)
            }
        },
        waitForLoads: (viewIds, timeout) =>
            new Promise((resolve) => {
                const waiting = new Set(viewIds)
                if (!waiting.size) {
                    resolve()
                    return
                }
                const done = () => {
                    listeners.delete(listener)
                    clearTimeout(timer)
                    resolve()
                }
                const listener = (viewId: string) => {
                    waiting.delete(viewId)
                    if (!waiting.size) {
                        done()
                    }
                }
                const timer = setTimeout(done, timeout)
                listeners.add(listener)
            }),
    }
}
