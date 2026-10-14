# Hyperion RAG service image (ROCm). Bakes the Python deps so a fresh
# container can run fully offline; model weights are NOT baked in — they come
# from a pre-populated Hugging Face cache volume mounted at $HF_HOME
# (see launch.sh / README "Offline HF cache").
ARG BASE_IMAGE=rocm:latest
FROM ${BASE_IMAGE}
RUN pip install --no-cache-dir "transformers>=5.19,<6" "sentence-transformers>=6.1,<7" "numpy>=2" pymupdf \
 && python3 -c "import transformers, sentence_transformers as s; print(transformers.__version__, s.__version__)"
ENV HF_HOME=/hf HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY scripts/ /app/scripts/
EXPOSE 8120
ENTRYPOINT ["python3", "/app/scripts/rag_server.py"]
