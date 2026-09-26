import { Workspace } from '@components/workspace/workspace'
import { screen } from '@testing-library/react'
import { afterAll, beforeAll, vi } from 'vitest'
import { renderWithStore } from './render-with-store'

/* jsdom has no layout, so dockview would measure a 0x0 container: call in
 * a spec file that renders the real workspace */
export const mockContainerSize = () => {
    beforeAll(() => {
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(
            1000
        )
        vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(
            800
        )
    })

    afterAll(() => {
        vi.restoreAllMocks()
    })
}

export const renderWorkspace = async () => {
    const view = renderWithStore(<Workspace />)
    await screen.findByRole('tab', { name: 'Add views' })
    return view
}
