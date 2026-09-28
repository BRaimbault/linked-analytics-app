import { getWorkspaceAnnouncement } from '@components/workspace/controller/announcements'
import type { IDockviewPanel } from 'dockview-react'
import { describe, expect, it } from 'vitest'

/* A panel shown in its cell, like a view on the grid */
const panel = (component: string, title: string) => {
    const shown = {
        title,
        api: { component },
        group: { panels: [] as unknown[] },
    }
    shown.group.panels.push(shown)
    return shown as unknown as IDockviewPanel
}

describe('getWorkspaceAnnouncement', () => {
    it('announces what happens to views, by their title', () => {
        const map = panel('view', 'Map 1')
        expect(getWorkspaceAnnouncement({ kind: 'open', panel: map })).toBe(
            'Map 1 added'
        )
        expect(getWorkspaceAnnouncement({ kind: 'close', panel: map })).toBe(
            'Map 1 closed'
        )
        expect(getWorkspaceAnnouncement({ kind: 'maximize', panel: map })).toBe(
            'Map 1 maximized'
        )
        expect(getWorkspaceAnnouncement({ kind: 'restore', panel: map })).toBe(
            'Map 1 restored'
        )
    })

    it('says nothing about restoring a view that has just been closed', () => {
        const closed = {
            title: 'Map 1',
            api: { component: 'view' },
            group: { panels: [] },
        } as unknown as IDockviewPanel

        expect(
            getWorkspaceAnnouncement({ kind: 'restore', panel: closed })
        ).toBeNull()
    })

    it('says nothing for other layout changes, and copes without a title', () => {
        const untitled = {
            api: { component: 'view' },
        } as unknown as IDockviewPanel
        expect(
            getWorkspaceAnnouncement({ kind: 'float', panel: untitled })
        ).toBeNull()
        expect(
            getWorkspaceAnnouncement({ kind: 'open', panel: untitled })
        ).toBe(' added')
    })

    it('stays silent about tool, settings and swap-spacer tabs', () => {
        for (const component of ['add-views', 'view-settings', 'swap-spacer']) {
            expect(
                getWorkspaceAnnouncement({
                    kind: 'open',
                    panel: panel(component, 'x'),
                })
            ).toBeNull()
        }
    })
})
