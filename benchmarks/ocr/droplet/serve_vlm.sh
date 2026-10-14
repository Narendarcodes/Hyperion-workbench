#!/bin/bash
# usage: serve_vlm.sh <engine> ; starts container hx-ocr serving on 127.0.0.1:8110 (<=20 GB VRAM)
set -e
ENGINE=$1; PORT=${PORT:-8110}; UTIL=${UTIL:-0.095}
case $ENGINE in
  qwen3vl)  MODEL=Qwen/Qwen3-VL-8B-Instruct-FP8; EXTRA="--max-model-len 12288 --limit-mm-per-prompt {\"image\":1,\"video\":0}" ;;
  olmocr)   MODEL=allenai/olmOCR-2-7B-1025-FP8;  EXTRA="--max-model-len 12288 --limit-mm-per-prompt {\"image\":1,\"video\":0}" ;;
  deepseekocr) MODEL=deepseek-ai/DeepSeek-OCR;   EXTRA="--max-model-len 8192 --trust-remote-code --no-enable-prefix-caching --mm-processor-cache-gb 0 --logits-processors vllm.model_executor.models.deepseek_ocr:NGramPerReqLogitsProcessor" ;;
  mineru)   MODEL=opendatalab/MinerU2.5-2509-1.2B; EXTRA="--max-model-len 12288" ;;
  *) echo unknown; exit 2;;
esac
docker rm -f hx-ocr >/dev/null 2>&1 || true
docker run -d --name hx-ocr --network host --ipc host --device /dev/kfd --device /dev/dri --group-add video \
  --security-opt seccomp=unconfined -e GLOO_SOCKET_IFNAME=lo -e VLLM_HOST_IP=127.0.0.1 -v /root/.cache/huggingface:/root/.cache/huggingface -v /root/hx/ocr:/w \
  vllm/vllm-openai-rocm:v0.27.1 --model $MODEL --served-model-name ocr --host 127.0.0.1 --port $PORT \
  --gpu-memory-utilization $UTIL --max-num-seqs 32 $EXTRA
echo started $ENGINE $MODEL
