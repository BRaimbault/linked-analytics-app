#!/bin/bash
# Lint script - runs all linting tools and collects errors
# Exit with non-zero code if any tool fails

echo "Running all linting tools..."
echo "============================"

EXIT_CODE=0

# TypeScript check
if ! bash ./scripts/check-typescript.sh; then
    EXIT_CODE=1
fi
echo ""

# ESLint check
echo "🔍 Checking ESLint..."
if ! pnpm exec eslint .; then
    echo "❌ ESLint check failed"
    EXIT_CODE=1
else
    echo "✅ ESLint check passed"
fi
echo ""

# Stylelint check
echo "🔍 Checking Stylelint..."
if ! pnpm exec stylelint "**/*.{css,scss,tsx}" --max-warnings=0; then
    echo "❌ Stylelint check failed"
    EXIT_CODE=1
else
    echo "✅ Stylelint check passed"
fi
echo ""

# ls-lint check
echo "🔍 Checking ls-lint..."
if ! pnpm exec ls-lint; then
    echo "❌ ls-lint check failed"
    EXIT_CODE=1
else
    echo "✅ ls-lint check passed"
fi
echo ""

# Prettier check
echo "🔍 Checking Prettier..."
if ! pnpm exec prettier --check .; then
    echo "❌ Prettier check failed"
    EXIT_CODE=1
else
    echo "✅ Prettier check passed"
fi
echo ""

echo "============================"
if [ $EXIT_CODE -eq 0 ]; then
    echo "🎉 All linting checks passed!"
else
    echo "💥 Some linting checks failed. Please fix the issues above."
fi

exit $EXIT_CODE
