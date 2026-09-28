import { includeIgnoreFile } from '@eslint/compat'
import dhis2ReactConfig from '@dhis2/config-eslint/react'
import { defineConfig, globalIgnores } from 'eslint/config'
import { fileURLToPath } from 'node:url'
import testingLibrary from 'eslint-plugin-testing-library'

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url))

const baseAppRuntimeHooksRestriction = {
    importNames: ['useDataQuery', 'useDataMutation', 'useDataEngine'],
    message: "Use 'useRtkQuery' and 'useRtkMutation' from 'src/hooks' instead.",
}

const sharedRestrictedImportPatterns = [
    {
        group: [
            '**/types/dhis2-openapi-schemas',
            '**/types/dhis2-openapi-schemas/*',
        ],
        message:
            "Import DHIS2 Core schema-types from '@types' instead of directly from generated files.",
    },
]

const restrictedImportPaths = [
    {
        name: '@dhis2/app-runtime',
        ...baseAppRuntimeHooksRestriction,
    },
    {
        name: '@dhis2/app-service-data',
        ...baseAppRuntimeHooksRestriction,
    },
    {
        name: 'react-redux',
        importNames: ['useDispatch', 'useSelector', 'useStore'],
        message:
            "Use 'useAppDispatch', 'useAppSelector', and 'useAppStore' from 'src/hooks' instead for proper typing.",
    },
]

/* Flat config replaces a rule's options wholesale, so every override of
 * no-restricted-imports builds its options here, with the shared patterns
 * and paths. */
const restrictImports = (...patterns) => [
    'error',
    {
        patterns: [...sharedRestrictedImportPatterns, ...patterns],
        paths: restrictedImportPaths,
    },
]

const noParentImports = {
    group: ['../*'],
    message:
        "Relative parent imports are not allowed. Use path aliases (e.g. '@hooks', '@components') instead.",
}

/* Imports flow one way between layers (docs/code-structure.md §4.1). Every
 * import in src uses an alias, so the rule matches alias names. Tests are
 * held to it too, but hooks' tests, which render a provider. */
const LAYERS = [
    {
        files: ['src/modules/**/*.{ts,tsx}'],
        forbidden: ['@components/*', '@store/*', '@api/*', '@hooks'],
        message:
            'modules/ holds pure logic: it may not import from components, store, api or hooks.',
    },
    {
        files: ['src/store/**/*.{ts,tsx}', 'src/api/**/*.{ts,tsx}'],
        forbidden: ['@components/*'],
        message: 'store/ and api/ may not import from components.',
    },
    {
        files: ['src/hooks/**/*.{ts,tsx}'],
        ignores: ['**/__tests__/**'],
        forbidden: ['@components/*'],
        message: 'hooks/ may not import from components.',
    },
]

const layerRules = LAYERS.map(
    ({ files, ignores = [], forbidden, message }) => ({
        files,
        ignores,
        rules: {
            'no-restricted-imports': restrictImports(noParentImports, {
                group: forbidden,
                message,
            }),
        },
    })
)

export default defineConfig([
    includeIgnoreFile(gitignorePath),

    { extends: [dhis2ReactConfig] },

    globalIgnores(['.vite/**/*', 'scripts/**/*', '.claude/**']),

    // The base config only loads the @typescript-eslint plugin for .ts/.tsx
    {
        files: ['src/**/*.{ts,tsx}'],
        rules: {
            '@typescript-eslint/consistent-type-imports': 'error',
        },
    },

    // Project-wide custom rules
    {
        rules: {
            /* Disable import/named — it produces false positives with path aliases
             * and packages like @dhis2/ui since the TS resolver is not configured.
             * TypeScript itself catches these errors. */
            'import/named': 'off',
            // Disable React Compiler rules from react-hooks v7 — too aggressive for this codebase
            'react-hooks/immutability': 'off',
            'react-hooks/preserve-manual-memoization': 'off',
            'react-hooks/use-memo': 'off',
            'react-hooks/globals': 'off',
            'import/no-default-export': 'error',
            'no-console': 'error',
            'no-restricted-imports': restrictImports(noParentImports),
        },
    },

    // Override: config files need default exports
    {
        files: ['*.config.*', '.prettierrc.*'],
        rules: {
            'import/order': 'off',
            'import/no-default-export': 'off',
        },
    },

    // Override: the import direction between layers, after the rules above
    ...layerRules,

    // Override: types/index.ts
    {
        files: ['src/types/index.ts'],
        rules: {
            'no-restricted-imports': 'off',
        },
    },

    /* Override: vitest spec files — apply testing-library/react preset to
     * catch missing-await on async utils (`waitFor`, `findBy*`, etc.) and
     * other React Testing Library footguns. */
    {
        files: ['src/**/*.spec.{ts,tsx}'],
        extends: [testingLibrary.configs['flat/react']],
        rules: {
            // Disabled so we can access DHIS2-UI internals by className etc.
            'testing-library/no-node-access': 'off',
            'no-restricted-globals': [
                'error',
                ...[
                    'describe',
                    'it',
                    'test',
                    'expect',
                    'beforeEach',
                    'afterEach',
                    'beforeAll',
                    'afterAll',
                ].map((name) => ({
                    name,
                    message: `Import ${name} from 'vitest' instead of using the global.`,
                })),
            ],
        },
    },
])
