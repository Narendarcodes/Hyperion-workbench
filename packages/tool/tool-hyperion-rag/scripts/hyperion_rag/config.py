"""Typed runtime configuration for the Hyperion RAG core and service.

Every deployment choice (model ids, endpoints, thresholds, paths, batch
sizes) is read here from the environment, with the documented default below.
No other module hard-codes these values. ``RagConfig.describe()`` renders the
table used in the package README.

| env | default | meaning |
"""

from __future__ import annotations

import os
from dataclasses import dataclass, fields


def _int(v: str, name: str) -> int:
    try:
        return int(v)
    except ValueError as exc:
        raise ValueError(f"{name} must be an integer, got {v!r}") from exc


def _float(v: str, name: str) -> float:
    try:
        return float(v)
    except ValueError as exc:
        raise ValueError(f"{name} must be a number, got {v!r}") from exc


@dataclass(frozen=True)
class RagConfig:
    # models
    embed_model: str
    embed_fallback: str
    reranker_model: str
    llm_url: str
    llm_model: str
    llm_reasoning_effort: str
    # resources
    vram_gb: float
    embed_batch: int
    rerank_batch: int
    # chunking / retrieval
    chunk_max_chars: int
    chunk_min_chars: int
    dim: int
    default_mode: str
    rerank_top: int
    retrieval_pool: int
    # OCR hand-off
    ocr_url: str
    ocr_min_chars: int
    ocr_concurrency: int
    ocr_dpi: int
    ocr_timeout_s: float
    # service
    host: str
    port: int
    index_dir: str
    ingest_dir: str
    max_upload_bytes: int

    # name -> (env var, default, description)
    ENV = {
        "HYPERION_RAG_EMBED_MODEL": ("embed_model", "google/embeddinggemma-2", "dense encoder (HF id or local path)"),
        "HYPERION_RAG_EMBED_FALLBACK": ("embed_fallback", "", "optional second encoder tried when the first fails; empty = report degraded instead"),
        "HYPERION_RAG_RERANK_MODEL": ("reranker_model", "BAAI/bge-reranker-v2-m3", "cross-encoder reranker"),
        "HYPERION_LLM_URL": ("llm_url", "http://127.0.0.1:8001/v1", "OpenAI-compatible base URL of the answering model"),
        "HYPERION_LLM_MODEL": ("llm_model", "llm", "served model name for answers"),
        "HYPERION_LLM_REASONING_EFFORT": ("llm_reasoning_effort", "low", "reasoning_effort sent with each answer request"),
        "HYPERION_RAG_VRAM_GB": ("vram_gb", "6", "per-process VRAM cap (GiB)"),
        "HYPERION_RAG_EMBED_BATCH": ("embed_batch", "16", "encoder batch size"),
        "HYPERION_RAG_RERANK_BATCH": ("rerank_batch", "16", "reranker batch size"),
        "HYPERION_RAG_CHUNK_MAX_CHARS": ("chunk_max_chars", "1600", "largest chunk"),
        "HYPERION_RAG_CHUNK_MIN_CHARS": ("chunk_min_chars", "300", "smallest chunk before merging"),
        "HYPERION_RAG_DIM": ("dim", "768", "Matryoshka dimension (768/512/256/128)"),
        "HYPERION_RAG_MODE": ("default_mode", "hybrid_rerank", "retrieval mode when dense+rerank are available"),
        "HYPERION_RAG_RERANK_TOP": ("rerank_top", "30", "fused candidates passed to the reranker"),
        "HYPERION_RAG_POOL": ("retrieval_pool", "100", "candidates per retriever before fusion"),
        "HYPERION_OCR_URL": ("ocr_url", "", "OCR sidecar base URL (empty = scanned pages are reported ocr-pending)"),
        "HYPERION_RAG_OCR_MIN_CHARS": ("ocr_min_chars", "40", "pages with fewer native text characters are sent to OCR"),
        "HYPERION_RAG_OCR_CONCURRENCY": ("ocr_concurrency", "8", "parallel page requests to the OCR sidecar"),
        "HYPERION_RAG_OCR_DPI": ("ocr_dpi", "200", "page render resolution for OCR"),
        "HYPERION_RAG_OCR_TIMEOUT_S": ("ocr_timeout_s", "300", "per-page OCR timeout"),
        "HYPERION_RAG_HOST": ("host", "127.0.0.1", "service bind address"),
        "HYPERION_RAG_PORT": ("port", "8120", "service port"),
        "HYPERION_RAG_INDEX_DIR": ("index_dir", "./index", "persistent index directory"),
        "HYPERION_RAG_INGEST_DIR": ("ingest_dir", "./ingest", "where uploaded originals are kept"),
        "HYPERION_RAG_MAX_UPLOAD_BYTES": ("max_upload_bytes", "52428800", "largest accepted upload (50 MiB)"),
    }

    @classmethod
    def from_env(cls, env: dict | None = None) -> "RagConfig":
        env = os.environ if env is None else env
        types = {f.name: f.type for f in fields(cls)}
        values = {}
        for var, (attr, default, _) in cls.ENV.items():
            raw = env.get(var, default)
            t = types[attr]
            values[attr] = _int(raw, var) if t in (int, "int") else _float(raw, var) if t in (float, "float") else raw
        if values["dim"] not in (768, 512, 256, 128):
            raise ValueError("HYPERION_RAG_DIM must be 768, 512, 256 or 128")
        return cls(**values)

    @classmethod
    def describe(cls) -> str:
        rows = [f"| `{var}` | `{default or '(empty)'}` | {doc} |" for var, (_, default, doc) in cls.ENV.items()]
        return "| env | default | meaning |\n|---|---|---|\n" + "\n".join(rows)
