#!/usr/bin/env bash

# PostToolUse hook for Edit|Write. Formats the edited file with prettier and lints it
# with eslint/stylelint. PostToolUse hooks receive their payload as JSON on stdin, and
# only structured `additionalContext` JSON reaches the model — plain stdout is shown to
# the human transcript but never to the assistant. So results the model must act on
# (lint errors, "I reformatted your file") are emitted as additionalContext. Always
# exits 0: it informs, it never blocks.

set -uo pipefail

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
[ -n "$file" ] && [ -f "$file" ] || exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

notes=""
append() { notes="${notes:+$notes$'\n'}$1"; }

format() {
    local changed
    if ! changed=$(pnpm exec prettier --write --list-different "$file" 2>/dev/null); then
        append "prettier could not format $file (likely a syntax error) — check it."
    elif [ -n "$changed" ]; then
        append "prettier reformatted $file — re-read it before making further edits."
    fi
}

run_eslint() {
    lint=$(pnpm exec eslint "$file" 2>&1) || append "eslint errors in $file:"$'\n'"$lint"
}

run_stylelint() {
    lint=$(pnpm exec stylelint "$file" --max-warnings=0 2>&1) || append "stylelint errors in $file:"$'\n'"$lint"
}

# Same file groups as lint-staged in package.json
case "$file" in
    *.tsx)
        format
        run_eslint
        run_stylelint
        ;;
    *.js | *.jsx | *.ts | *.cjs | *.mjs | *.cts | *.mts)
        format
        run_eslint
        ;;
    *.css | *.scss)
        format
        run_stylelint
        ;;
    *.json | *.md | *.yml | *.yaml)
        format
        ;;
    *)
        exit 0
        ;;
esac

[ -n "$notes" ] || exit 0
jq -n --arg ctx "$notes" '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $ctx}}'
exit 0
