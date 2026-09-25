#!/bin/bash
# Checks the whole project with tsc; exits non-zero on any error

echo "🔍 Checking TypeScript..."
if pnpm exec tsc --project tsconfig.json --noEmit --skipLibCheck; then
    echo "✅ TypeScript check passed"
else
    echo "❌ TypeScript check failed"
    exit 1
fi
