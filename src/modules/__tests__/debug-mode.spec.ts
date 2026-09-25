import { beforeEach, describe, expect, it, vi } from 'vitest'

/* The level is computed once when the module loads, so each test sets up
 * localStorage first and then imports a fresh copy. */
const importDebugMode = () => import('../debug-mode')

describe('debug mode', () => {
    beforeEach(() => {
        vi.resetModules()
    })

    it('is silent under test by default', async () => {
        const { getLogLevel, isDebugMode } = await importDebugMode()

        expect(getLogLevel()).toBe('silent')
        expect(isDebugMode()).toBe(false)
    })

    it('uses a valid level from localStorage', async () => {
        localStorage.setItem('LINKED_ANALYTICS_LOG_LEVEL', 'debug')

        const { getLogLevel, isDebugMode } = await importDebugMode()

        expect(getLogLevel()).toBe('debug')
        expect(isDebugMode()).toBe(true)
    })

    it('ignores an unknown level in localStorage', async () => {
        localStorage.setItem('LINKED_ANALYTICS_LOG_LEVEL', 'verbose')

        const { getLogLevel } = await importDebugMode()

        expect(getLogLevel()).toBe('silent')
    })

    it('ignores localStorage when it cannot be read', async () => {
        vi.stubGlobal('localStorage', {
            getItem: () => {
                throw new Error('Access denied')
            },
        })

        const { getLogLevel } = await importDebugMode()

        expect(getLogLevel()).toBe('silent')
    })

    it('uses debug in development', async () => {
        vi.stubEnv('NODE_ENV', 'development')

        const { getLogLevel, isDebugMode } = await importDebugMode()

        expect(getLogLevel()).toBe('debug')
        expect(isDebugMode()).toBe(true)
    })

    it('only logs errors in production', async () => {
        vi.stubEnv('NODE_ENV', 'production')

        const { getLogLevel, isDebugMode } = await importDebugMode()

        expect(getLogLevel()).toBe('error')
        expect(isDebugMode()).toBe(false)
    })

    it('treats warn as not debug mode', async () => {
        localStorage.setItem('LINKED_ANALYTICS_LOG_LEVEL', 'warn')

        const { isDebugMode } = await importDebugMode()

        expect(isDebugMode()).toBe(false)
    })
})
