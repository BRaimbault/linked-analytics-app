import { register as registerCypressGrep } from '@cypress/grep'
import { mount } from 'cypress/react'

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
