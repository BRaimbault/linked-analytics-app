# Sourced by the git hooks and the Claude Code format hook. IDEs and Claude Code start
# them with the user's default Node, which can be older than `engines` allows; when nvm
# is installed, switch to the version in .nvmrc for this run only.

NVM_SCRIPT="${NVM_DIR:-$HOME/.nvm}/nvm.sh"
if [ -s "$NVM_SCRIPT" ]; then
    . "$NVM_SCRIPT" --no-use
    nvm use --silent >/dev/null 2>&1 || true
fi
