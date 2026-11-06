import { usePluginLoads } from '@components/plugins/plugin-loads'
import type { LinkItem } from '@modules/interactions/apply-links'
import { getPlayStartIndex } from '@modules/selectors/timeline'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/* Each step shows at least this long, so the eye can follow */
export const STEP_PAUSE = 1200

/* A view that never says it has drawn holds a step no longer than this */
export const LOAD_TIMEOUT = 4000

const wait = (ms: number) =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, ms)
    })

/* Play steps through a timeline's periods: each step sets the next period,
 * then waits for every view the channel drives to draw it, and stops at
 * the last period. */
export const useTimelinePlay = ({
    periods,
    index,
    receiverIds,
    select,
}: {
    periods: LinkItem[]
    index: number | null
    receiverIds: string[]
    select: (period: LinkItem) => void
}): { isPlaying: boolean; play: () => void; pause: () => void } => {
    const [isPlaying, setPlaying] = useState(false)
    const { waitForLoads } = usePluginLoads()

    /* Read when a step starts, so a change to them doesn't restart play */
    const latest = useRef({ index, receiverIds, select })
    useLayoutEffect(() => {
        latest.current = { index, receiverIds, select }
    })

    /* The period play set last: another value (a month clicked on a chart,
     * a cleared selector) pauses it. Checked before play's own effect, which
     * sets it. */
    const playedIndex = useRef<number | null>(null)
    useEffect(() => {
        if (!isPlaying) {
            playedIndex.current = null
        } else if (
            playedIndex.current !== null &&
            index !== playedIndex.current
        ) {
            setPlaying(false)
        }
    }, [isPlaying, index])

    useEffect(() => {
        if (!isPlaying) {
            return
        }
        let isCancelled = false
        const step = (next: number) => {
            const drawn = waitForLoads(latest.current.receiverIds, LOAD_TIMEOUT)
            playedIndex.current = next
            latest.current.select(periods[next])
            void Promise.all([drawn, wait(STEP_PAUSE)]).then(() => {
                if (isCancelled) {
                    return
                }
                if (next >= periods.length - 1) {
                    setPlaying(false)
                } else {
                    step(next + 1)
                }
            })
        }
        step(getPlayStartIndex(latest.current.index, periods.length))
        return () => {
            isCancelled = true
        }
    }, [isPlaying, periods, waitForLoads])

    return {
        isPlaying,
        play: () => setPlaying(true),
        pause: () => setPlaying(false),
    }
}
