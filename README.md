# Linked Analytics

View DHIS2 Maps, Data Visualizer and other analytics plugins side by side in a drag-and-drop grid, and link them so a selection in one updates the others.

Unreleased, under active development. Built with the [DHIS2 Application Platform](https://github.com/dhis2/app-platform); tooling and conventions follow [dhis2/event-visualizer-app](https://github.com/dhis2/event-visualizer-app).

## Requirements

- **Node.js 24** (see `.nvmrc`). pnpm refuses to run on versions older than 22.22.2. With nvm: `nvm install && nvm use`.
- **pnpm**, at the version pinned by `packageManager` in `package.json` (e.g. through `corepack enable`).
- **`jq`**, only if you use Claude Code: its format hook needs it.

The git hooks switch to the `.nvmrc` version themselves when nvm is installed, so committing from an IDE works even if your default Node is older.

## Getting started

1. `pnpm install`. The install also:
    - points git's `core.hooksPath` at `.hooks/` (hooks on `pre-commit`, `pre-push` and `commit-msg`);
    - copies `dhis2.env.template.json` to `dhis2.env.json` (the dev server URL and credentials, gitignored);
    - generates the translations into `src/locales/`;
    - generates TypeScript types from the dev server's OpenAPI spec into `src/types/dhis2-openapi-schemas/` (gitignored) if they're missing. So the first install needs the dev server to be reachable.
2. Check `dhis2.env.json`, and change the server or credentials if needed.
3. `pnpm start --proxy https://dev.im.dhis2.org/analytics-dev`, open http://localhost:3000, and sign in with the server and credentials from `dhis2.env.json`.

## Scripts

| Script                | What it does                                                                                                                                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm start`          | Runs the app in development mode on http://localhost:3000 (add `--proxy <server>` as above).                                                                                                               |
| `pnpm test`           | Runs the unit tests with Vitest. `pnpm test:watch` runs them in watch mode.                                                                                                                                |
| `pnpm test:coverage`  | Runs the unit tests with coverage: a terminal summary, an HTML report in `coverage/index.html` and an `lcov.info` file. Fails below 100%, so new code needs tests. CI posts the coverage on pull requests. |
| `pnpm cy:comp:run`    | Runs every Cypress component test headless. They check what unit tests can't: layout, CSS and drag and drop. CI runs them on every pull request.                                                           |
| `pnpm cy:comp:smoke`  | Runs only the smoke tests, a few per group: a check in a few seconds.                                                                                                                                      |
| `pnpm cy:comp:open`   | Opens the Cypress interactive runner.                                                                                                                                                                      |
| `pnpm lint`           | Runs the TypeScript, ESLint, Stylelint, ls-lint and Prettier checks.                                                                                                                                       |
| `pnpm format`         | Fixes what the linters can fix automatically.                                                                                                                                                              |
| `pnpm build`          | Builds the app for production into `build/`, with a deployable `.zip` in `build/bundle`.                                                                                                                   |
| `pnpm run deploy`     | Deploys the built app to a running DHIS2 instance; run `pnpm build` first. (`pnpm deploy` alone is a pnpm command.)                                                                                        |
| `pnpm generate-types` | Regenerates the API types from the server in `dhis2.env.json`, e.g. after it moves to a new DHIS2 version.                                                                                                 |

From VS Code's terminal, run the Cypress scripts as `env -u ELECTRON_RUN_AS_NODE pnpm cy:comp:run`: VS Code sets that variable, and Cypress then fails to start.

## Troubleshooting

- **The dev server stops after a file is saved**: some editors and scripts save through a temporary file, which crashes the d2-app-scripts watcher. Restart `pnpm start`.
- **Broken files (e.g. HTML served for `manifest.json`)**: `pnpm build` ran while `pnpm start` was running; both regenerate `.d2/shell`. Restart the dev server.
- **The app shell looks stale after a dependency upgrade**: delete `.d2/` and restart the dev server.
- **pnpm refuses to install or run** (`ERR_PNPM_UNSUPPORTED_ENGINE`): your Node is older than 22.22.2. Run `nvm use`, or `nvm alias default 24`.
- **More logging**: set `localStorage.LINKED_ANALYTICS_LOG_LEVEL` to `debug` in the browser.

## Documentation

- [docs/](docs/README.md): the design docs and the repo's history, with an index, the terms they use and their conventions:
    - [history.md](docs/history.md): how the repo got here, including how its tooling differs from the scaffold and from event-visualizer-app;
    - [workspace-grid.md](docs/workspace-grid.md): the grid (placing, sizing, drops);
    - [interactions.md](docs/interactions.md): how views link, and the upstream plugin changes;
    - [plugins.md](docs/plugins.md): what the DHIS2 plugins accept;
    - [view-settings.md](docs/view-settings.md): picking, creating and editing a view's item;
    - [selector-controls.md](docs/selector-controls.md), [map-layers.md](docs/map-layers.md) and [demo-mode.md](docs/demo-mode.md).
- [CLAUDE.md](./CLAUDE.md): code conventions, architecture notes, gotchas and the plan. Written for AI coding agents, and useful to people too.

## Contributing

- Conventional commits (`feat:`, `fix:`, `chore:`…), checked by commitlint.
- Feature branches and pull requests; new features come with tests.

## License

[BSD-3-Clause](./LICENSE)
