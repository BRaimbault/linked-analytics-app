import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import { importAliases } from './import-aliases.mjs'

export default defineConfig({
    plugins: [react()],
    resolve: { alias: importAliases },
    test: {
        setupFiles: './vitest.setup.ts',
        environment: 'jsdom',
        clearMocks: true,
        unstubEnvs: true,
        unstubGlobals: true,
        exclude: [
            ...configDefaults.exclude,
            '**/.d2/**',
            '**/.claude/**',
            // Third-party sources fetched for reference by `npx opensrc`
            '**/opensrc/**',
        ],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                '**/__tests__/**',
                '**/*.spec.{ts,tsx}',
                'src/types/**',
                'src/locales/**',
            ],
            // json-summary and json feed the PR coverage comment in CI
            reporter: ['text', 'html', 'lcov', 'json-summary', 'json'],
            reportOnFailure: true,
            thresholds: { 100: true },
        },
        onConsoleLog(log, type) {
            // Suppress styled-jsx StyleSheet warnings from DHIS2 UI components
            if (type === 'stderr' && log.includes('StyleSheet: illegal rule')) {
                return false
            }
        },
    },
})
