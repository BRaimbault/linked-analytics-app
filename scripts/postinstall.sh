#!/bin/bash
set -e

if git rev-parse --is-inside-work-tree >/dev/null 2>&1 &&
    [ "$(git config --get core.hooksPath)" != ".hooks" ]; then
    git config core.hooksPath .hooks
fi

if [ ! -f dhis2.env.json ]; then
    echo "📋 Copying dhis2.env.template.json to dhis2.env.json..."
    cp dhis2.env.template.json dhis2.env.json
fi

# The app and its tests import the generated translations from src/locales
pnpm d2-app-scripts i18n generate

# Locally a failure only warns so the install still completes; CI fails here rather than later in lint
if [ ! -f src/types/dhis2-openapi-schemas/index.ts ] && ! pnpm generate-types; then
    if [ -n "${CI:-}" ]; then
        echo "❌ Type generation failed; lint and tests need these types." >&2
        exit 1
    fi
    echo "⚠️  Type generation failed (is the server in dhis2.env.json reachable?). Run 'pnpm generate-types' later."
fi
