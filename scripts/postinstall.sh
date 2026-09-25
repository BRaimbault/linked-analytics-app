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

if [ ! -f src/types/dhis2-openapi-schemas/index.ts ]; then
    pnpm generate-types ||
        echo "⚠️  Type generation failed (is the server in dhis2.env.json reachable?). Run 'pnpm generate-types' later."
fi
