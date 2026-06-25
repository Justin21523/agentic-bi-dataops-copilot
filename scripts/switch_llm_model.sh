#!/usr/bin/env bash
# Switch the llama-server to a different model profile.
# Usage: ./scripts/switch_llm_model.sh [7b|14b|27b|35b]

set -euo pipefail

PROFILE="${1:-7b}"
OPENCLAW_DIR="$HOME/.openclaw"

case "$PROFILE" in
  7b)
    SRC="$OPENCLAW_DIR/llamacpp-cuda-7b.env"
    MODEL_DESC="Qwen2.5-7B-Instruct Q4_K_M"
    ;;
  14b)
    SRC="$OPENCLAW_DIR/llamacpp-cuda-14b.env"
    MODEL_DESC="Qwen2.5-14B-Instruct Q4_K_M"
    ;;
  27b)
    SRC="$OPENCLAW_DIR/llamacpp-cuda-27b.env"
    MODEL_DESC="Qwen3.6-27B Q4_K_XL"
    ;;
  35b)
    SRC="$OPENCLAW_DIR/llamacpp-cuda-35b.env"
    MODEL_DESC="Qwen3.6-35B-A3B MoE Q4_K_XL"
    ;;
  *)
    echo "Usage: $0 [7b|14b|27b|35b]"
    exit 1
    ;;
esac

if [ ! -f "$SRC" ]; then
  echo "Error: Profile not found: $SRC"
  exit 1
fi

# Check if 7B model is downloaded yet
if [ "$PROFILE" = "7b" ]; then
  MODEL_PATH="/mnt/c/ai_models/language/llm/Qwen2.5-7B-Instruct-GGUF/Qwen2.5-7B-Instruct-Q4_K_M.gguf"
  if [ ! -f "$MODEL_PATH" ]; then
    echo "Error: 7B model not yet downloaded at $MODEL_PATH"
    echo "Check download progress: tail -f /tmp/download_7b.log"
    exit 1
  fi
fi

echo "Switching llama-server to: $MODEL_DESC"
cp "$SRC" "$OPENCLAW_DIR/llamacpp-active.env"
systemctl --user restart llama-server.service
echo "Done. llama-server is restarting with $MODEL_DESC"
echo "Wait ~10-30 seconds for the model to load, then test at http://localhost:8080/health"
