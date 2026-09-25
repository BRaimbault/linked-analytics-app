#!/bin/bash
# Format script - runs all formatting tools
# Exit with non-zero code if any tool fails

echo "Running all formatting tools..."
echo "==============================="

EXIT_CODE=0

# ESLint fix
echo "🔧 Running ESLint --fix..."
if ! pnpm exec eslint . --fix; then
    echo "❌ ESLint formatting failed"
    EXIT_CODE=1
else
    echo "✅ ESLint formatting completed"
fi
echo ""

# Stylelint fix
echo "🔧 Running Stylelint --fix..."
if ! pnpm exec stylelint "**/*.{css,scss,tsx}" --fix --max-warnings=0; then
    echo "❌ Stylelint formatting failed"
    EXIT_CODE=1
else
    echo "✅ Stylelint formatting completed"
fi
echo ""

# Prettier fix
echo "🔧 Running Prettier --write..."
if ! pnpm exec prettier --write . > /dev/null 2>&1; then
    echo "❌ Prettier formatting failed"
    EXIT_CODE=1
else
    echo "✅ Prettier formatting completed"
fi
echo ""

echo "==============================="
if [ $EXIT_CODE -eq 0 ]; then
    echo "🎉 All formatting completed successfully!"
else
    echo "💥 Some formatting failed. Please check the errors above."
fi

exit $EXIT_CODE
