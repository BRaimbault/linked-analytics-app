import { register as registerCypressGrep } from '@cypress/grep'
import { mount } from 'cypress/react'
/* The font the app shell loads: without it, each browser measures text in
 * its own fallback font, and layout checks test what no user sees */
import 'typeface-roboto'

registerCypressGrep()

Cypress.Commands.add('mount', mount)

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
    namespace Cypress {
        interface Chainable {
            mount: typeof mount
        }
    }
}
/* eslint-enable @typescript-eslint/no-namespace */
