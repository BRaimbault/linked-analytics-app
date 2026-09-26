import { plugin as cypressGrepPlugin } from '@cypress/grep/plugin'
import { defineConfig } from 'cypress'
import viteConfig from './vite-cypress.config.mjs'

/* Component tests only: they mount components in a real browser, for what
 * jsdom cannot check (layout, CSS, native drag and drop) */
export default defineConfig({
    component: {
        specPattern: 'src/**/*.cy.tsx',
        devServer: {
            framework: 'react',
            bundler: 'vite',
            viteConfig,
        },
        viewportWidth: 1280,
        viewportHeight: 800,
        /* Lets `pnpm cy:comp:smoke` skip the specs without smoke tests */
        setupNodeEvents: (_on, config) => {
            cypressGrepPlugin(config)
            return config
        },
    },
    video: false,
    retries: { runMode: 1, openMode: 0 },
})
