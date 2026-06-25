#!/usr/bin/env bash
# Start llama-server for this project with the specified model size.
# Usage: ./scripts/start_llm.sh [7b|14b]   (default: 7b if downloaded, else 14b)

set -euo pipefail

LLAMA_BIN="/mnt/c/ai_tools/llama.cpp-cuda/build/bin/llama-server"
LD_LIBS="/home/justin/miniconda3/envs/ai_env/lib:/home/justin/miniconda3/envs/ai_env/targets/x86_64-linux/lib:/home/justin/miniconda3/envs/ai_env/lib/python3.10/site-packages/nvidia/cu13/lib"

MODEL_7B_DIR="/mnt/c/ai_models/language/llm/Qwen2.5-7B-Instruct-GGUF"
MODEL_7B="$MODEL_7B_DIR/qwen2.5-7b-instruct-q4_k_m-00001-of-00002.gguf"
MODEL_7B_P2="$MODEL_7B_DIR/qwen2.5-7b-instruct-q4_k_m-00002-of-00002.gguf"
MODEL_14B="/mnt/c/ai_models/language/llm/Qwen2.5-14B-Instruct-GGUF/Qwen2.5-14B-Instruct-Q4_K_M.gguf"

SELECT="${1:-auto}"

if [ "$SELECT" = "auto" ] || [ "$SELECT" = "7b" ]; then
    if [ -f "$MODEL_7B" ] && [ -f "$MODEL_7B_P2" ]; then
        # Verify both parts are complete (not 0-byte)
        SIZE1=$(stat -c%s "$MODEL_7B" 2>/dev/null || echo 0)
        SIZE2=$(stat -c%s "$MODEL_7B_P2" 2>/dev/null || echo 0)
        if [ "$SIZE1" -gt 1000000 ] && [ "$SIZE2" -gt 1000000 ]; then
            MODEL="$MODEL_7B"
            LABEL="Qwen2.5-7B-Instruct Q4_K_M"
            CTX=32768
        else
            echo "⚠  7B model still downloading. Using 14B instead."
            MODEL="$MODEL_14B"
            LABEL="Qwen2.5-14B-Instruct Q4_K_M"
            CTX=32768
        fi
    else
        echo "⚠  7B model not found. Using 14B."
        MODEL="$MODEL_14B"
        LABEL="Qwen2.5-14B-Instruct Q4_K_M"
        CTX=32768
    fi
elif [ "$SELECT" = "14b" ]; then
    MODEL="$MODEL_14B"
    LABEL="Qwen2.5-14B-Instruct Q4_K_M"
    CTX=32768
else
    echo "Usage: $0 [7b|14b]"
    exit 1
fi

# Kill existing llama-server on port 8080
pkill -f "llama-server.*8080" 2>/dev/null || true
systemctl --user stop llama-server.service 2>/dev/null || true
sleep 1

echo "Starting llama-server: $LABEL"
echo "Model: $MODEL"

exec env LD_LIBRARY_PATH="$LD_LIBS" "$LLAMA_BIN" \
    -m "$MODEL" \
    --port 8080 \
    --host 0.0.0.0 \
    --n-gpu-layers 99 \
    --ctx-size "$CTX" \
    --parallel 1 \
    --threads 16 \
    --batch-size 2048 \
    --temp 0.1 \
    --no-warmup
