#!/bin/bash
docker rm -f hx-ocr >/dev/null 2>&1 || true
docker run -d --name hx-ocr --network host --ipc host --device /dev/kfd --device /dev/dri --group-add video \
  --security-opt seccomp=unconfined -e GLOO_SOCKET_IFNAME=lo -e VLLM_HOST_IP=127.0.0.1 \
  -v /root/hx/ocr/pip:/pip -v /root/.cache/huggingface:/root/.cache/huggingface -v /root/hx/ocr:/w \
  --entrypoint bash vllm/vllm-openai-rocm:v0.27.1 -c 'pip install -q --no-deps --target /pip mineru-vl-utils && export PYTHONPATH=/pip && \
  vllm serve opendatalab/MinerU2.5-2509-1.2B --served-model-name ocr --host 127.0.0.1 --port 8110 --gpu-memory-utilization 0.06 \
  --max-num-seqs 64 --max-model-len 12288 --logits-processors mineru_vl_utils:MinerULogitsProcessor'
