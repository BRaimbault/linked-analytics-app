import i18n from '@dhis2/d2-i18n'
import type { IDockviewPanel } from 'dockview-react'
import { isViewPanel } from './panels'

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
            return i18n.t('{{title}} restored', { title, interpolation })
        default:
            return null
    }
}
