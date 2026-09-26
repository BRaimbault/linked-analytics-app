import { CustomDataProvider } from '@dhis2/app-runtime'
import { render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it } from 'vitest'
import { App } from '../app'

type CustomData = ComponentProps<typeof CustomDataProvider>['data']

const renderApp = (data: CustomData) =>
    render(
        <CustomDataProvider data={data}>
            <App />
        </CustomDataProvider>
    )

describe('App', () => {
    it('shows a loader while the current user is loading', () => {
        renderApp({ me: () => new Promise(() => {}) })

        expect(
            screen.getByTestId('dhis2-uicore-circularloader')
        ).toBeInTheDocument()
    })

    it('shows the workspace once the current user is loaded', async () => {
        renderApp({ me: { id: 'user-a' } })

        expect(await screen.findByTestId('workspace')).toBeInTheDocument()
    })

    it('shows an error when the current user cannot be loaded', async () => {
        renderApp({
            me: () => {
                throw new Error('Server unreachable')
            },
        })

        expect(
            await screen.findByText('Could not load the app')
        ).toBeInTheDocument()
        expect(screen.getByText('Server unreachable')).toBeInTheDocument()
    })
})
