import { useCallback, useState } from 'react'
import type { TourKind } from './tour-steps'

const TOUR_SEEN_KEY = 'linked-analytics.demo-tour-seen'

/* The browser's storage can be unavailable (blocked site data): the story
 * tour then starts on every visit, and nothing breaks */
const hasSeenTour = (): boolean => {
    try {
        return localStorage.getItem(TOUR_SEEN_KEY) === 'true'
    } catch {
        return false
    }
}

const rememberTourSeen = (): void => {
    try {
        localStorage.setItem(TOUR_SEEN_KEY, 'true')
    } catch {
        /* Not remembered: offered again next time */
    }
}

/* A tour to start; each request gets a new id, which starts it again */
export type TourRequest = { id: number; kind: TourKind }

/* The story tour starts by itself until a browser has seen a tour, then
 * either starts when asked for. It's marked seen once it starts, not on
 * mount: the app can mount the demo twice. */
export const useTourRequest = (): {
    request: TourRequest | null
    takeTour: (kind: TourKind) => void
    onTourStarted: () => void
} => {
    const [request, setRequest] = useState<TourRequest | null>(() =>
        hasSeenTour() ? null : { id: 1, kind: 'story' }
    )
    const takeTour = useCallback(
        (kind: TourKind) =>
            setRequest((current) => ({ id: (current?.id ?? 0) + 1, kind })),
        []
    )
    return { request, takeTour, onTourStarted: rememberTourSeen }
}
