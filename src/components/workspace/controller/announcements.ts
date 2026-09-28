import i18n from '@dhis2/d2-i18n'
import type { IDockviewPanel } from 'dockview-react'
import { isViewPanel } from './panels'

const isStillInItsCell = (panel: IDockviewPanel): boolean =>
    Boolean(panel.group?.panels.includes(panel))

/* Screen-reader announcements: only changes the user made to views are
 * spoken, translated. Tool and settings tabs open and close on their own,
 * and swap spacers are internal. */
export const getWorkspaceAnnouncement = (event: {
    kind: string
    panel: IDockviewPanel
}): string | null => {
    if (!isViewPanel(event.panel)) {
        return null
    }
    const title = event.panel.title ?? ''
    const interpolation = { escapeValue: false }
    switch (event.kind) {
        case 'open':
            return i18n.t('{{title}} added', { title, interpolation })
        case 'close':
            return i18n.t('{{title}} closed', { title, interpolation })
        case 'maximize':
            return i18n.t('{{title}} maximized', { title, interpolation })
        case 'restore':
            /* Closing a maximized view also restores the grid; the view is
             * gone from its cell by then, and "closed" must stay the last
             * word the live region holds */
            return isStillInItsCell(event.panel)
                ? i18n.t('{{title}} restored', { title, interpolation })
                : null
        default:
            return null
    }
}
