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

/* Browsers only let a drop read the payload; while dragging over, only the
 * list of formats is visible. So the type is also carried as a format of
 * its own, to size drop targets and apply the view limit mid-drag. */
const VIEW_TYPE_MIME_PREFIX = `${VIEW_DRAG_MIME}-type-`

export const getViewTypeMime = (type: ViewType): string =>
    `${VIEW_TYPE_MIME_PREFIX}${type}`

export const getDraggedViewType = (
    formats: readonly string[] | undefined
): ViewType | null => {
    const type = formats
        ?.find((format) => format.startsWith(VIEW_TYPE_MIME_PREFIX))
        ?.slice(VIEW_TYPE_MIME_PREFIX.length)
    return isViewType(type) ? type : null
}
