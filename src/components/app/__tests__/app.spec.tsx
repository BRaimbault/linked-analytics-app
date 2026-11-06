import { App } from '@components/app/app'
import { CustomDataProvider } from '@dhis2/app-runtime'
import { render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

type CustomData = ComponentProps<typeof CustomDataProvider>['data']

const renderApp = (data: CustomData) =>
    render(
        <CustomDataProvider data={data}>
            <App />
        </CustomDataProvider>
    )

describe('App', () => {
    afterEach(() => {
        window.history.pushState({}, '', '/')
    })

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

    it('shows the demo workspace with ?demo, and only then', async () => {
        window.history.pushState({}, '', '/?demo')
        renderApp({ me: { id: 'user-a' } })

        /* The demo's code loads on demand, slower while every spec runs */
        expect(
            await screen.findByTestId('demo-banner', {}, { timeout: 5000 })
        ).toBeInTheDocument()
    })

    it('shows no demo banner without ?demo', async () => {
        renderApp({ me: { id: 'user-a' } })

        await screen.findByTestId('workspace')
        expect(screen.queryByTestId('demo-banner')).toBeNull()
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
