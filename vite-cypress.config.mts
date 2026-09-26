import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { importAliases } from './import-aliases.mjs'

/* The Vite config Cypress mounts components with */
export default defineConfig({
    plugins: [react()],
    resolve: { alias: importAliases },
    publicDir: false,
    appType: 'custom',
})
