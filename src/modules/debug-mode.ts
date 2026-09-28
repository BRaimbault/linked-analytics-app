import type { LogLevelNames } from 'loglevel'

const LOG_LEVEL_KEY = 'LINKED_ANALYTICS_LOG_LEVEL'

export type LogLevel = LogLevelNames | 'silent'

const LOG_LEVELS: readonly LogLevel[] = [
    'trace',
    'debug',
    'info',
    'warn',
    'error',
    'silent',
]

const DEBUG_LEVELS: ReadonlySet<LogLevel> = new Set(['trace', 'debug', 'info'])

const isLogLevel = (value: unknown): value is LogLevel =>
    typeof value === 'string' &&
    (LOG_LEVELS as readonly string[]).includes(value)

const readLocalStorageOverride = (): LogLevel | null => {
    try {
        const raw = globalThis.localStorage?.getItem(LOG_LEVEL_KEY)
        return isLogLevel(raw) ? raw : null
    } catch {
        return null
    }
}

const computeLogLevel = (): LogLevel => {
    const localStorageOverride = readLocalStorageOverride()
    if (localStorageOverride) {
        return localStorageOverride
    }
    if (process.env.NODE_ENV === 'development') {
        return 'debug'
    }
    if (process.env.NODE_ENV === 'test') {
        return 'silent'
    }
    return 'error'
}

const level: LogLevel = computeLogLevel()

export const getLogLevel = (): LogLevel => level

export const isDebugMode = (): boolean => DEBUG_LEVELS.has(level)
