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

# Apply every patch in lexical order so adding a numbered patch does not
# require editing this script. The first two retain their upstream-specific
# compatibility checks.
for patch in "$ROOT"/patches/*.patch; do
  [[ -f "$patch" ]] || continue
  name="$(basename "$patch")"
  case "$name" in
    0001-*)
      if grep -q 'Loading config from SPIFFS' firmware/src/main.cpp 2>/dev/null; then
        echo "Skipping $name (already in upstream)"
      else
        apply_patch "$patch"
      fi
      ;;
    0002-*)
      if grep -q 'Bahasa Melayu Malaysia' firmware/src/llm/ChatGPT/RealtimeChatGPT.cpp 2>/dev/null; then
        echo "Skipping $name (Malay role already installed)"
      else
        apply_patch "$patch"
      fi
      ;;
    *)
      apply_patch "$patch"
      ;;
  esac
done

# Select the original OpenAI Realtime audio model. Keep this idempotent so a
# rerun after a partial bootstrap restores the original model if necessary.
REALTIME_FILE="firmware/src/llm/ChatGPT/RealtimeChatGPT.cpp"
if grep -q 'gpt-realtime-2.1' "$REALTIME_FILE" 2>/dev/null; then
  sed -i 's/gpt-realtime-2.1/gpt-realtime/g' "$REALTIME_FILE"
  echo "Selected gpt-realtime"
fi

# CoreS3 shares an I2S peripheral between mic and speaker. Do not restart the
# mic while the buffered playback task still owns queued audio.
if grep -q 'while (M5.Speaker.isPlaying())' "$REALTIME_FILE" 2>/dev/null; then
  sed -i 's/while (M5.Speaker.isPlaying())/while (M5.Speaker.isPlaying() || uxQueueMessagesWaiting(p_this->audioReadyQueue) > 0)/' "$REALTIME_FILE"
  echo "Added audio queue drain before microphone restart"
fi

AUDIO_HEADER="firmware/src/llm/RealtimeLLMBase.h"
if grep -q 'RT_AUDIO_CHUNK_SIZE (16 \* 1024)' "$AUDIO_HEADER" 2>/dev/null; then
  sed -i 's/RT_AUDIO_CHUNK_SIZE (16 \* 1024)/RT_AUDIO_CHUNK_SIZE (64 * 1024)/' "$AUDIO_HEADER"
  echo "Expanded Realtime audio chunk buffer to 64 KB"
fi

echo "Bootstrap OK. Next:"
echo "  1. Create local/SC_SecConfig.yaml from config/*.example"
echo "  2. ./scripts/apply-local-config.sh"
echo "  3. ./scripts/flash.sh"
