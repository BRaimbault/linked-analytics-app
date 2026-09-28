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
        setupNodeEvents: (on, config) => {
            /* Lets `pnpm cy:comp:smoke` skip the specs without smoke tests */
            cypressGrepPlugin(config)
            /* Headless Chrome reports no pointer that hovers, and ignores
             * the DevTools media emulation here: it runs as a desktop with
             * a mouse instead. Headless Firefox keeps no hover, so the two
             * browsers cover both cases (headers.cy.tsx). */
            on('before:browser:launch', (browser, launchOptions) => {
                if (browser.family === 'chromium') {
                    launchOptions.args.push(
                        '--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4'
                    )
                }
                return launchOptions
            })
            return config
        },
    },
    video: false,
    /* No retries: after a failure screenshot, animation frames nearly stop,
     * so dockview never positions view bodies and a retry can pass by
     * mistake. The checks retry instead (expectLayout, cellSize…). */
    retries: 0,
})
