import { getDemoValue } from '@modules/demo/demo-flag'
import { useCallback, useState } from 'react'
import type { TourKind } from './tour-steps'
import { TOURS } from './tours'

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

/* The tour the page's address names, as in ?demo=climate */
export const getAddressTour = (search: string): TourKind | null => {
    const value = getDemoValue(search)
    return value && value in TOURS ? (value as TourKind) : null
}

/* The tour the address names starts on every visit, so a link can open
 * one. Without one, the Malaria story starts by itself until a browser has
 * seen a tour, then any starts when asked for. It's marked seen once it
 * starts, not on mount: the app can mount the demo twice. */
export const useTourRequest = (): {
    request: TourRequest | null
    takeTour: (kind: TourKind) => void
    onTourStarted: () => void
} => {
    const [request, setRequest] = useState<TourRequest | null>(() => {
        const kind =
            getAddressTour(window.location.search) ??
            (hasSeenTour() ? null : 'malaria')
        return kind && { id: 1, kind }
    })
    const takeTour = useCallback(
        (kind: TourKind) =>
            setRequest((current) => ({ id: (current?.id ?? 0) + 1, kind })),
        []
    )
    return { request, takeTour, onTourStarted: rememberTourSeen }
}
