# Linked Analytics

View DHIS2 Maps, Data Visualizer and other analytics plugins side by side in a flexible grid, and link them so selections in one update the others.

This project was bootstrapped with [DHIS2 Application Platform](https://github.com/dhis2/app-platform). Its tooling and conventions follow [dhis2/event-visualizer-app](https://github.com/dhis2/event-visualizer-app).

## Requirements

- Node.js 24 (see `.nvmrc`; `engines` in `package.json` requires 22.22.2 or newer, and pnpm refuses to run on older versions). With nvm: `nvm install && nvm use`. The git hooks switch to the `.nvmrc` version themselves when nvm is installed, so committing from an IDE works even if your default Node is older
- pnpm (the version is pinned in `package.json` under `packageManager`)
- `jq`, only if you use Claude Code (its format hook needs it)

## Available Scripts

### `pnpm install`

Installs dependencies. Its `postinstall` step also:

1. Points git's `core.hooksPath` at the tracked `.hooks/` directory (hooks run on `pre-commit`, `pre-push` and `commit-msg`)
2. Copies `dhis2.env.template.json` to `dhis2.env.json` (dev server URL and credentials, gitignored)
3. Generates the translations into `src/locales/`
4. Generates TypeScript types from the dev server's OpenAPI spec into `src/types/dhis2-openapi-schemas/` (gitignored), if they are missing

### `pnpm start`

Runs the app in development mode on [http://localhost:3000](http://localhost:3000). To work against the analytics dev server:

```bash
pnpm start --proxy https://dev.im.dhis2.org/analytics-dev
```

Sign in with the server and credentials from `dhis2.env.json`.

### `pnpm test`

Runs the unit tests with Vitest. `pnpm test:watch` runs them in watch mode.

### `pnpm test:coverage`

Runs the unit tests and reports coverage: a summary in the terminal, plus an HTML report in `coverage/index.html` and an `lcov.info` file for CI tools. It fails if coverage drops below 100%, so new code needs tests. On pull requests, CI posts the coverage as a PR comment.

### `pnpm lint` / `pnpm format`

`pnpm lint` runs TypeScript, ESLint, Stylelint, ls-lint and Prettier checks. `pnpm format` fixes what can be fixed automatically.

### `pnpm build`

Builds the app for production into `build/`. A deployable `.zip` file ends up in `build/bundle`.

### `pnpm run deploy`

Deploys the built app to a running DHIS2 instance. Run `pnpm build` first.

### `pnpm generate-types`

Regenerates the TypeScript types in `src/types/dhis2-openapi-schemas/` from the OpenAPI spec of the server in `dhis2.env.json`, e.g. after the dev server moves to a new DHIS2 version.

## Contributing

- Conventional commits (`feat:`, `fix:`, `chore:`, …), checked by commitlint.
- Feature branches and pull requests; new features come with tests.
- See [`CLAUDE.md`](./CLAUDE.md) for code conventions, architecture notes and the project plan.

## License

[BSD-3-Clause](./LICENSE)
