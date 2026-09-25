import path from 'node:path'

export const importAliases = {
    '@types': path.resolve(import.meta.dirname, 'src/types/index.ts'),
    '@hooks': path.resolve(import.meta.dirname, 'src/hooks/index.ts'),
    '@api': path.resolve(import.meta.dirname, 'src/api'),
    '@components': path.resolve(import.meta.dirname, 'src/components'),
    '@locales': path.resolve(import.meta.dirname, 'src/locales'),
    '@modules': path.resolve(import.meta.dirname, 'src/modules'),
    '@store': path.resolve(import.meta.dirname, 'src/store'),
}
