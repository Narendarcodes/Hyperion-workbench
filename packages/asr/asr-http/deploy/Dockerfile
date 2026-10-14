# Hyperion STT sidecar for AMD Instinct (ROCm). Serves py/stt_server.py with warm engines.
# Build from the package directory:  docker build -f deploy/Dockerfile -t hx-stt-sidecar .
# Weights are NOT baked in: mount the Hugging Face cache and the gated SraVaani checkout at run time
# (see deploy/launch.sh). Base image must ship a ROCm build of PyTorch.
ARG BASE=rocm/pytorch:latest
FROM ${BASE}
ENV PYTHONUNBUFFERED=1 HF_HOME=/root/.cache/huggingface
RUN pip install --no-cache-dir "transformers>=4.57" "huggingface_hub>=0.34" librosa soundfile sentencepiece numpy \
 && pip install --no-cache-dir onnxruntime   # IndicConformer (optional engine) runs on CPU via ONNX
WORKDIR /opt/stt
COPY py/stt_server.py py/plantnorm.py ./
EXPOSE 8790
HEALTHCHECK --interval=30s --timeout=5s --start-period=180s CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8790/healthz',timeout=4).status==200 else 1)"
ENTRYPOINT ["python", "/opt/stt/stt_server.py", "--host", "0.0.0.0", "--port", "8790"]
# Default routing = benchmark winner (docs/benchmarks/stt.md): IndicConformer-600M (ONNX, CPU) for te/hi and
# code-mixed Tenglish/Hinglish, Whisper large-v3-turbo (GPU) for en, SraVaani-1.0 (GPU) loaded as the named fallback.
CMD ["--engine", "indicconformer=indicconformer:/models/indicconformer", \
     "--engine", "whisper-turbo=whisper:openai/whisper-large-v3-turbo", \
     "--engine", "sravaani=sravaani:/models/sravaani", \
     "--route", "te=indicconformer", "--route", "hi=indicconformer", "--route", "en=whisper-turbo", "--route", "*=sravaani", \
     "--preload"]
