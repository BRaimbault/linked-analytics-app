#!/bin/bash
set -euo pipefail

# Server and credentials come from dhis2.env.json, falling back to the template
ENV_FILE="dhis2.env.json"
[ -f "$ENV_FILE" ] || ENV_FILE="dhis2.env.template.json"
read_env() {
    node -p "require('./$ENV_FILE').$1"
}
BASE_URL="$(read_env dhis2BaseUrl)"
AUTH="$(read_env dhis2Username):$(read_env dhis2Password)"

API_URL="$BASE_URL/api/openapi.yaml?expandedRefs=true"
TYPES_DIR="./src/types/dhis2-openapi-schemas"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT

# Everything is built in TEMP_DIR and only moved into place at the end, so any failure keeps the existing types
echo "📥 Fetching OpenAPI specification from $BASE_URL..."
curl --fail --silent --show-error --location -H "Accept: application/x-yaml" -u "$AUTH" "$API_URL" -o "$TEMP_DIR/openapi.yaml"

echo "⌛ Generating TypeScript types..."
pnpm exec openapi-typescript "$TEMP_DIR/openapi.yaml" --output "$TEMP_DIR/generated.ts"

echo "🔗 Generating named type aliases..."
awk '
BEGIN {
    print "// AUTO-GENERATED FILE: Named type aliases for OpenAPI schemas"
    print "// Regenerate this file if the OpenAPI spec changes.\n"
    print "import type { components } from '\''./generated'\'';\n"
    print "type Schemas = components['\''schemas'\''];\n"
}
# Only the direct children of `components.schemas`; stop at the block's closing brace
/^export interface components \{/ { in_components=1; next }
in_components && /^    schemas: \{/ { in_schemas=1; next }
in_schemas && /^    \};?$/ { exit }
in_schemas && /^        [A-Za-z0-9_]+\??:/ {
    key = $1
    sub(/\??:$/, "", key)
    print "export type " key " = Schemas[\047" key "\047];"
}
' "$TEMP_DIR/generated.ts" > "$TEMP_DIR/index.ts"

if ! grep -q "^export type " "$TEMP_DIR/index.ts"; then
    echo "❌ No schema types found in the OpenAPI spec from $BASE_URL — keeping the existing types" >&2
    exit 1
fi

rm -rf "$TYPES_DIR"
mkdir -p "$TYPES_DIR"
mv "$TEMP_DIR/generated.ts" "$TEMP_DIR/index.ts" "$TYPES_DIR/"

echo "✅ Types generated in $TYPES_DIR"
