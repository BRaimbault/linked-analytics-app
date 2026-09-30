import { register as registerCypressGrep } from '@cypress/grep'
import { mount } from 'cypress/react'
/* The font the app shell loads: without it, each browser measures text in
 * its own fallback font, and layout checks test what no user sees */
import 'typeface-roboto'

registerCypressGrep()

Cypress.Commands.add('mount', mount)

/* A known DHIS2 UI bug (@dhis2-ui/select 10.17.0, still in 10.19.0): a
 * select re-measures its input 50ms after a window resize, and the pending
 * call isn't cancelled on unmount. Removing a select in those 50ms, e.g.
 * closing a view right after a resize, throws from a timer ("this.inputRef
 * .current is null" in Firefox, "Cannot destructure property 'offsetWidth'
 * of 'this.inputRef.current'" in Chrome). Users see it only in the
 * console. Only this error is ignored; any other still fails the test.
 * Remove this once @dhis2/ui is upgraded to a release with the fix
 * proposed upstream ("fix(select): cancel the pending resize measurement
 * on unmount"). See docs/history.md §5, item 6. */
Cypress.on('uncaught:exception', (error) =>
    error.message.includes('this.inputRef.current') ? false : undefined
)

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
    namespace Cypress {
        interface Chainable {
            mount: typeof mount
        }
    }
}
/* eslint-enable @typescript-eslint/no-namespace */
