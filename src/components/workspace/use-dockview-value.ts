import { useEffect, useState } from 'react'

type Subscription = { dispose: () => void }

/* A dockview value (e.g. whether a group is collapsed) kept in React
 * state, read again whenever dockview says it may have changed, and when
 * what it is read from changes */
export const useDockviewValue = <T>(
    read: () => T,
    subscribe: (listener: () => void) => Subscription
): T => {
    const [value, setValue] = useState(read)

    useEffect(() => {
        setValue(read())
        const subscription = subscribe(() => setValue(read()))
        return () => subscription.dispose()
    }, [read, subscribe])

    return value
}
