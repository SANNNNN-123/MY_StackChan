#!/usr/bin/env bash
# Clone AI_StackChan_Ex into ./upstream and apply local patches.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UPSTREAM_DIR="$ROOT/upstream"
REPO_URL="${AI_STACKCHAN_EX_URL:-https://github.com/ronron-gh/AI_StackChan_Ex.git}"
if [[ ! -d "$UPSTREAM_DIR/.git" ]]; then
  echo "Cloning $REPO_URL → $UPSTREAM_DIR"
  git clone --depth 1 "$REPO_URL" "$UPSTREAM_DIR"
else
  echo "Upstream already present at $UPSTREAM_DIR"
fi

cd "$UPSTREAM_DIR"

apply_patch() {
  local patch="$1"
  if [[ ! -f "$patch" ]]; then
    echo "Missing patch: $patch" >&2
    exit 1
  fi
  if git apply --check "$patch" 2>/dev/null; then
    echo "Applying $(basename "$patch")"
    git apply "$patch"
  elif git apply --reverse --check "$patch" 2>/dev/null; then
    echo "Already applied: $(basename "$patch")"
  else
    if git apply "$patch"; then
      echo "Applied: $(basename "$patch")"
    else
      echo "ERROR: could not apply $(basename "$patch") cleanly" >&2
      exit 1
    fi
  fi
}

# Upstream now ships CoreS3 SD→SPIFFS fallback itself (load_system_config).
# Keep 0001 only as a historical record for older clones.
if grep -q 'Loading config from SPIFFS' firmware/src/main.cpp 2>/dev/null; then
  echo "Skipping 0001-cores3-spiffs-config-fallback.patch (already in upstream)"
else
  echo "Upstream lacks SPIFFS fallback; applying 0001"
  apply_patch "$ROOT/patches/0001-cores3-spiffs-config-fallback.patch"
fi

apply_patch "$ROOT/patches/0002-english-default-role.patch"

echo "Bootstrap OK. Next:"
echo "  1. Create local/SC_SecConfig.yaml from config/*.example"
echo "  2. ./scripts/apply-local-config.sh"
echo "  3. ./scripts/flash.sh"
