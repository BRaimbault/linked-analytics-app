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

    it('welcomes the current user by name', async () => {
        renderApp({ me: { name: 'John Traore' } })

        expect(
            await screen.findByRole('heading', {
                name: 'Welcome, John Traore!',
            })
        ).toBeInTheDocument()
    })

    it('shows names with special characters as typed', async () => {
        renderApp({ me: { name: "Seán O'Brien & Co / HQ" } })

        expect(
            await screen.findByRole('heading', {
                name: "Welcome, Seán O'Brien & Co / HQ!",
            })
        ).toBeInTheDocument()
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
