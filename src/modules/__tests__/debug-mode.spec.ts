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

    it('treats warn as not debug mode', async () => {
        localStorage.setItem('LINKED_ANALYTICS_LOG_LEVEL', 'warn')

        const { isDebugMode } = await importDebugMode()

        expect(isDebugMode()).toBe(false)
    })
})
