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
    },
    video: false,
    retries: { runMode: 1, openMode: 0 },
})
