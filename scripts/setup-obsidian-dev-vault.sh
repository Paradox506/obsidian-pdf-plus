#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   scripts/setup-obsidian-dev-vault.sh /path/to/your/vault
#
# This script creates a symlink from this repository into an Obsidian vault's
# plugin folder so that `pnpm dev` writes directly to the vault plugin path.

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 /absolute/path/to/obsidian-vault" >&2
  exit 1
fi

VAULT_PATH="$1"
if [[ ! -d "$VAULT_PATH" ]]; then
  echo "Vault path does not exist: $VAULT_PATH" >&2
  exit 1
fi

if [[ ! -d "$VAULT_PATH/.obsidian" ]]; then
  echo "Not an Obsidian vault (missing .obsidian): $VAULT_PATH" >&2
  exit 1
fi

PLUGIN_ID="pdf-plus"
TARGET_DIR="$VAULT_PATH/.obsidian/plugins/$PLUGIN_ID"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

mkdir -p "$(dirname "$TARGET_DIR")"

if [[ -e "$TARGET_DIR" && ! -L "$TARGET_DIR" ]]; then
  echo "Target exists and is not a symlink: $TARGET_DIR" >&2
  echo "Please remove it manually first." >&2
  exit 1
fi

rm -f "$TARGET_DIR"
ln -s "$REPO_DIR" "$TARGET_DIR"

echo "Linked: $TARGET_DIR -> $REPO_DIR"
echo "Now run: pnpm dev"
echo "Then restart/reload Obsidian and enable 'PDF++' in Community plugins."
