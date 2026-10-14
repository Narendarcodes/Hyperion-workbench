#!/usr/bin/env bash
# Start/stop the Hyperion RAG service container (ROCm).
#   deploy/launch.sh build                 # build the deps image (needs network once)
#   CORPUS="/data/a /data/b" deploy/launch.sh start
#   deploy/launch.sh stop | status
#
# Everything is configurable from the environment; defaults in brackets.
#   IMAGE               [hx-rag:deps]           image with transformers>=5.19, sentence-transformers>=6.1
#   BASE_IMAGE          [rocm:latest]           base for `build`
#   NAME                [hx-rag-svc]            container name
#   HF_CACHE            [$HOME/.cache/huggingface]  pre-populated HF cache, mounted read-only at /hf
#   DATA_DIR            [$PWD/rag-data]         index + uploads (mounted at /data)
#   CORPUS              []                      corpus paths (inside the container) for the first build
#   HYPERION_RAG_*, HYPERION_LLM_*, HYPERION_OCR_URL   passed through (see scripts/hyperion_rag/config.py)
# The container runs with HF_HUB_OFFLINE=1: models must already be in HF_CACHE
# (pre-populate once with `huggingface-cli download google/embeddinggemma-2 BAAI/bge-reranker-v2-m3`).
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="${IMAGE:-hx-rag:deps}"
NAME="${NAME:-hx-rag-svc}"
HF_CACHE="${HF_CACHE:-$HOME/.cache/huggingface}"
DATA_DIR="${DATA_DIR:-$PWD/rag-data}"
PORT="${HYPERION_RAG_PORT:-8120}"
case "${1:-}" in
  build)
    docker build -t "$IMAGE" --build-arg BASE_IMAGE="${BASE_IMAGE:-rocm:latest}" -f "$HERE/deploy/Dockerfile" "$HERE" ;;
  start)
    mkdir -p "$DATA_DIR"
    envs=()
    for v in $(env | grep -oE '^(HYPERION_RAG|HYPERION_LLM|HYPERION_OCR|PYTORCH_CUDA_ALLOC_CONF)[A-Z_]*' || true); do envs+=(-e "$v"); done
    docker run -d --name "$NAME" --device /dev/kfd --device /dev/dri --group-add video --network host --ipc host \
      -e HF_HOME=/hf -e HF_HUB_OFFLINE=1 -e TRANSFORMERS_OFFLINE=1 \
      -e HYPERION_RAG_PORT="$PORT" -e HYPERION_RAG_INDEX_DIR=/data/index -e HYPERION_RAG_INGEST_DIR=/data/ingest \
      "${envs[@]}" -v "$HF_CACHE":/hf:ro -v "$DATA_DIR":/data -v "$HERE/scripts":/app/scripts:ro \
      --entrypoint python3 "$IMAGE" /app/scripts/rag_server.py --corpus ${CORPUS:-} ;;
  stop) docker rm -f "$NAME" ;;
  status) docker ps --filter name="$NAME"; curl -s "http://127.0.0.1:$PORT/health"; echo ;;
  *) echo "usage: $0 build|start|stop|status" >&2; exit 2 ;;
esac
