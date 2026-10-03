#!/usr/bin/env bash
# Voxiva CLI — install from a local clone (dev)
# Usage:
#   ./scripts/install.sh
#   ./scripts/install.sh /path/to/cli

set -euo pipefail

SOURCE="${1:-$(cd "$(dirname "$0")/.." && pwd)}"

echo ""
echo "  voxiva"
echo "  Installing from source…"
echo ""

# Bootstrap Node from official installer if missing.
if ! command -v node >/dev/null 2>&1 || [ "$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)" -lt 20 ]; then
  echo "Node.js 20+ missing — running one-line installer bootstrap…"
  curl -fsSL https://raw.githubusercontent.com/voxiva-ai/cli/main/install | bash
  export PATH="$HOME/.voxiva/bin:$HOME/.voxiva/runtime/current/bin:$HOME/.local/bin:$PATH"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js still missing after bootstrap."
  exit 1
fi

if [ ! -f "$SOURCE/package.json" ]; then
  echo "package.json not found in: $SOURCE"
  exit 1
fi

cd "$SOURCE"

echo "→ npm install"
npm install --no-fund --no-audit

echo "→ npm run build"
npm run build

echo "→ npm link (global voxiva command)"
npm link

echo ""
echo "✓ Voxiva CLI installed from source"
echo ""
voxiva --version
echo ""
echo "Next:"
echo "  voxiva"
echo "  then /models or /connect"
echo ""
echo "Prefer one-line install without cloning?"
echo "  curl -fsSL https://raw.githubusercontent.com/voxiva-ai/cli/main/install | bash"
echo ""
