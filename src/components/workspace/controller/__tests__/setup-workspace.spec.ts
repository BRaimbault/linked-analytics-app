import { asGroup } from '@components/workspace/__tests__/fake-dockview'
import { getEdgePosition } from '@components/workspace/controller/panels'
import { setupWorkspace } from '@components/workspace/controller/setup-workspace'
import { describe, expect, it, vi } from 'vitest'
import { setup, titles, twoColumns } from './controller-fixtures'

describe('setupWorkspace', () => {
    it('adds the tools once and removes every listener on cleanup', () => {
        const fake = setup()
        const addCalls = fake.api.addPanel.mock.calls.length

        const second = setupWorkspace(fake.asApi, vi.fn(), titles)
        second()
        fake.cleanup()

        expect(fake.api.addPanel).toHaveBeenCalledTimes(addCalls)
        expect(fake.listenerCount()).toBe(0)
    })

    it('cancels a mouse drag of Workspace or Add views before dockview readies it, until cleanup', () => {
        const fake = setup()
        const dragStart = (panelId: string, target = 'dv-tab') => {
            const tab = document.createElement('div')
            tab.className = 'dv-tab'
            tab.dataset.tabPanelId = panelId
            const content = document.createElement('span')
            tab.append(content)
            document.body.append(tab)
            /* dockview's own listener on the tab, which must see the drag
             * already cancelled */
            let seenCancelled = false
            tab.addEventListener('dragstart', (event) => {
                seenCancelled = event.defaultPrevented
            })
            ;(target === 'dv-tab' ? tab : content).dispatchEvent(
                new Event('dragstart', { bubbles: true, cancelable: true })
            )
            tab.remove()
            return seenCancelled
        }

        expect(dragStart('workspace')).toBe(true)
        expect(dragStart('add-views', 'content')).toBe(true)
        expect(dragStart('settings-map-a')).toBe(false)
        const fromDocument = new Event('dragstart', { cancelable: true })
        document.dispatchEvent(fromDocument)
        expect(fromDocument.defaultPrevented).toBe(false)

        fake.cleanup()
        expect(dragStart('workspace')).toBe(false)
    })

    it('reads the grid edge of a group', () => {
        const fake = setup()
        const [map] = twoColumns(fake)

        expect(getEdgePosition(asGroup(map.group))).toBeNull()
        expect(getEdgePosition(asGroup(fake.toolGroup))).toBe('top')
    })
})
