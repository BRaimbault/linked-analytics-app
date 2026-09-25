import { defineConfig } from 'vite'
import { importAliases } from './import-aliases.mjs'

const viteConfig = defineConfig(async (configEnv) => {
    const { mode } = configEnv
    return {
        // In dev environments, don't clear the terminal after files update
        clearScreen: mode !== 'development',
        resolve: { alias: importAliases },
    }
})

export default viteConfig
