import { isViewType, type ViewType } from './view-types'

export const VIEW_DRAG_MIME = 'application/x-linked-analytics-view'

export const encodeViewDrag = (type: ViewType): string =>
    JSON.stringify({ type })

export const decodeViewDrag = (raw: string | undefined): ViewType | null => {
    if (!raw) {
        return null
    }
    try {
        const payload: unknown = JSON.parse(raw)
        const type =
            typeof payload === 'object' && payload !== null
                ? (payload as { type?: unknown }).type
                : undefined
        return isViewType(type) ? type : null
    } catch {
        return null
    }
}
