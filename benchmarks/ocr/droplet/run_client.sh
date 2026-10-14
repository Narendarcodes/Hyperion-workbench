#!/bin/bash
# usage: run_client.sh <engine> [concurrency]  (runs detached; log in /root/hx/ocr/runs/<engine>.log)
mkdir -p /root/hx/ocr/runs
docker rm -f hx-ocr-client-$1 >/dev/null 2>&1
docker run -d --name hx-ocr-client-$1 --network host -v /root/hx/ocr:/w --entrypoint python3 vllm/vllm-openai-rocm:v0.27.1 \
  /w/droplet/run_vlm.py $1 /w/evalset /w/runs/$1 ${2:-16}
