#!/usr/bin/env bash
# Launch the Hyperion OCR stack on the AMD MI300X droplet:
#   hx-ocr-vlm      vLLM (ROCm) serving the benchmark winner on 127.0.0.1:${VLM_PORT:-8110}, capped to ~20 GB VRAM
#   hx-ocr-sidecar  ocr_sidecar.py on 127.0.0.1:${OCR_PORT:-8111} (PDF render + per-page VLM calls)
# Usage: deploy/launch.sh [start|stop|status]   (env: OCR_ENGINE=qwen3vl|olmocr|deepseekocr, VLM_GPU_UTIL, OCR_API_KEY)
# Point read_pdf at it:  HYPERION_OCR_PROVIDER=sidecar HYPERION_OCR_URL=http://127.0.0.1:8111
# (from a laptop, tunnel first:  ssh -L 8111:127.0.0.1:8111 root@<droplet>)
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="${VLLM_IMAGE:-vllm/vllm-openai-rocm:v0.27.1}"
VLM_PORT="${VLM_PORT:-8110}"; OCR_PORT="${OCR_PORT:-8111}"
# MI300X has 192 GiB; 0.095 ~= 18 GiB (weights + KV cache), inside the 20 GB OCR budget.
VLM_GPU_UTIL="${VLM_GPU_UTIL:-0.095}"
HF_CACHE="${HF_CACHE:-/root/.cache/huggingface}"
case "${OCR_ENGINE:-qwen3vl}" in
  qwen3vl)     MODEL=Qwen/Qwen3-VL-8B-Instruct-FP8; PRESET=qwen-vl
               EXTRA=(--max-model-len 12288 --limit-mm-per-prompt '{"image":1,"video":0}') ;;
  olmocr)      MODEL=allenai/olmOCR-2-7B-1025-FP8; PRESET=olmocr
               EXTRA=(--max-model-len 12288 --limit-mm-per-prompt '{"image":1,"video":0}') ;;
  deepseekocr) MODEL=deepseek-ai/DeepSeek-OCR; PRESET=deepseek-ocr
               EXTRA=(--max-model-len 8192 --trust-remote-code --no-enable-prefix-caching --mm-processor-cache-gb 0
                      --logits-processors vllm.model_executor.models.deepseek_ocr:NGramPerReqLogitsProcessor) ;;
  *) echo "unknown OCR_ENGINE=${OCR_ENGINE}" >&2; exit 2 ;;
esac

start() {
  if command -v rocm-smi >/dev/null; then rocm-smi --showmeminfo vram | grep -E 'Total (Used )?Memory' || true; fi
  docker rm -f hx-ocr-vlm hx-ocr-sidecar >/dev/null 2>&1 || true
  docker run -d --name hx-ocr-vlm --restart unless-stopped --network host --ipc host \
    --device /dev/kfd --device /dev/dri --group-add video --security-opt seccomp=unconfined \
    -e GLOO_SOCKET_IFNAME=lo -e VLLM_HOST_IP=127.0.0.1 -v "${HF_CACHE}:/root/.cache/huggingface" \
    "${IMAGE}" --model "${MODEL}" --served-model-name ocr --host 127.0.0.1 --port "${VLM_PORT}" \
    --gpu-memory-utilization "${VLM_GPU_UTIL}" --max-num-seqs 32 "${EXTRA[@]}"
  docker run -d --name hx-ocr-sidecar --restart unless-stopped --network host \
    -v "${HERE}:/app:ro" -v hx-ocr-pip:/pip -e PYTHONPATH=/pip \
    -e OCR_UPSTREAM="http://127.0.0.1:${VLM_PORT}/v1" -e OCR_MODEL=ocr -e OCR_PRESET="${PRESET}" \
    -e OCR_PORT="${OCR_PORT}" -e OCR_CONCURRENCY="${OCR_CONCURRENCY:-16}" -e OCR_API_KEY="${OCR_API_KEY:-}" \
    --entrypoint bash "${IMAGE}" -c 'python3 -c "import pymupdf" 2>/dev/null || pip install -q --target /pip pymupdf; exec python3 /app/ocr_sidecar.py'
  echo "waiting for vLLM (${MODEL}) ..."
  for _ in $(seq 120); do curl -sf "127.0.0.1:${VLM_PORT}/v1/models" >/dev/null && break; sleep 5; done
  curl -sf "127.0.0.1:${OCR_PORT}/health" && echo || { echo "sidecar not healthy yet: docker logs hx-ocr-sidecar" >&2; exit 1; }
}
stop() { docker rm -f hx-ocr-vlm hx-ocr-sidecar >/dev/null 2>&1 || true; echo stopped; }
status() { docker ps --filter name=hx-ocr --format '{{.Names}} {{.Status}}'; curl -s "127.0.0.1:${OCR_PORT}/health"; echo; }
"${1:-start}"
