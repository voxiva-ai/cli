#!/usr/bin/env bash
# Voxiva CLI — macOS / Linux installer
# Usage:
#   ./scripts/install.sh
#   ./scripts/install.sh /path/to/Voxiva\ CLI

set -euo pipefail

SOURCE="${1:-$(cd "$(dirname "$0")/.." && pwd)}"

echo ""
echo "  voxiva"
echo "  Installing Voxiva CLI..."
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20+ is required. Install from https://nodejs.org/"
  exit 1
fi

major="$(node -p "process.versions.node.split('.')[0]")"
if [ "$major" -lt 20 ]; then
  echo "Node.js 20+ is required."
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
echo "✓ Voxiva CLI installed"
echo ""
voxiva --version
echo ""
echo "Next:"
echo "  voxiva"
echo "  then /connect and /models"
echo ""
