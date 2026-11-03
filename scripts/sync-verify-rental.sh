#!/usr/bin/env bash
# Rebuild the verify-rental prototype and copy it into prototypes/verify-rental/.
# Usage: scripts/sync-verify-rental.sh [path-to-verify-rental-checkout]
# Defaults to .context/verify-rental (a clone of adigee/verify-rental).
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
src="${1:-$repo_root/.context/verify-rental}"
dest="$repo_root/prototypes/verify-rental"

if [ ! -f "$src/package.json" ]; then
  echo "No verify-rental checkout at $src. Clone adigee/verify-rental there or pass its path." >&2
  exit 1
fi

git -C "$src" pull --ff-only
(cd "$src" && npm install --no-audit --no-fund && npx vite build --base=./)

rm -rf "$dest"
mkdir -p "$dest"
cp -R "$src/dist/." "$dest/"

echo "Synced $src/dist to $dest"
echo "Next: commit the changes under prototypes/verify-rental/"
