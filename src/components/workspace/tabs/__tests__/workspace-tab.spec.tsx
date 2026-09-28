import { renderWithStore } from '@components/workspace/__tests__/render-with-store'
import { SWAP_SPACER_COMPONENT } from '@components/workspace/controller/panels'
import { WorkspaceTab } from '@components/workspace/tabs/workspace-tab'
import { screen } from '@testing-library/react'
import type { IDockviewPanelHeaderProps } from 'dockview-react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('dockview-react', () => ({
    DockviewDefaultTab: ({ api }: IDockviewPanelHeaderProps) => (
        <div data-test="default-tab">{api.title}</div>
    ),
}))

describe('WorkspaceTab', () => {
    it('shows no icon on a tab that stands for no view', () => {
        const props = {
            api: {
                id: 'swap-spacer-0',
                title: 'Spacer',
                component: SWAP_SPACER_COMPONENT,
                group: { api: { location: { type: 'grid' } } },
                onDidGroupChange: () => ({ dispose: () => undefined }),
            },
            containerApi: {},
            params: {},
        } as unknown as IDockviewPanelHeaderProps

        renderWithStore(<WorkspaceTab {...props} />)

        expect(screen.getByTestId('default-tab')).toHaveTextContent('Spacer')
        expect(screen.queryByTestId('tab-icon')).toBeNull()
    })
})
