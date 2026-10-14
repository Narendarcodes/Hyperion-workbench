#!/usr/bin/env bash
# Launch the Hyperion STT sidecar on the MI300X droplet (or any ROCm host).
#   INDICCONF_DIR local checkout of the gated ai4bharat/indic-conformer-600m-multilingual repo (MIT; accept access on HF first)
#   SRAVAANI_DIR  local checkout of the gated ARTPARK-IISc/SraVaani-1.0 repo (MIT; accept access on HF first)
#   HF_CACHE      Hugging Face cache holding openai/whisper-large-v3-turbo (downloaded on first start if absent)
#   IMAGE         a ROCm PyTorch image with the sidecar deps (default: build deploy/Dockerfile as hx-stt-sidecar)
#   PORT          host port, bound to 127.0.0.1 only (default 8790) — tunnel or reverse-proxy it, never expose raw
# Budget (measured peak): Whisper turbo ~1.75 GB + SraVaani ~2.26 GB VRAM; IndicConformer runs on CPU. Well inside 12 GB.
set -euo pipefail
NAME=${NAME:-hx-stt-sidecar}
IMAGE=${IMAGE:-hx-stt-sidecar}
PORT=${PORT:-8790}
INDICCONF_DIR=${INDICCONF_DIR:?set INDICCONF_DIR to the indic-conformer-600m-multilingual checkout}
SRAVAANI_DIR=${SRAVAANI_DIR:?set SRAVAANI_DIR to the SraVaani-1.0 checkout}
HF_CACHE=${HF_CACHE:-/root/.cache/huggingface}
HERE=$(cd "$(dirname "$0")/.." && pwd)
if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  docker build -f "$HERE/deploy/Dockerfile" -t "$IMAGE" "$HERE"
fi
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" --restart unless-stopped \
  --device /dev/kfd --device /dev/dri --group-add video --ipc=host \
  -p 127.0.0.1:"$PORT":8790 \
  -v "$HF_CACHE":/root/.cache/huggingface \
  -v "$INDICCONF_DIR":/models/indicconformer:ro \
  -v "$SRAVAANI_DIR":/models/sravaani:ro \
  "$IMAGE" "$@"
echo "waiting for $NAME on 127.0.0.1:$PORT ..."
for _ in $(seq 1 90); do
  if curl -fsS "http://127.0.0.1:$PORT/healthz" >/dev/null 2>&1; then curl -fsS "http://127.0.0.1:$PORT/healthz"; echo; exit 0; fi
  sleep 2
done
echo "sidecar did not become healthy; docker logs $NAME" >&2; exit 1
