/** @type {import('@dhis2/cli-app-scripts').D2Config} */
const config = {
    type: 'app',
    name: 'linked-analytics',
    title: 'Linked Analytics',
    description:
        'View DHIS2 Maps, Data Visualizer and other analytics plugins side by side in a flexible grid, and link them so selections in one update the others.',
    direction: 'auto',

    entryPoints: {
        app: './src/app.ts',
    },

    viteConfigExtensions: 'vite-extensions.config.mts',
}

module.exports = config
