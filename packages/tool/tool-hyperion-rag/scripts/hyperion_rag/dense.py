"""Dense retrieval with EmbeddingGemma 2 (model id from ``HYPERION_RAG_EMBED_MODEL``).

No silent fallback: an optional second encoder is used only when
``HYPERION_RAG_EMBED_FALLBACK`` names one; otherwise a failed preflight raises
and callers report ``degraded`` (BM25-only).

Follows the model card (https://huggingface.co/google/embeddinggemma-2,
read 2026-10-14):
- text-only load: ``config_kwargs={"vision_config": None, "audio_config": None}``
  (270M effective); full multimodal load only when image chunks are embedded;
- bf16 or fp32, never fp16 (fp16 yields NaN / silently degraded vectors);
- query prefix ``task: question answering | query: {q}``; document format
  ``title: {title} | text: {content}``;
- Matryoshka: truncate to 512/256/128 then L2 re-normalise; queries and
  corpus must share one dimension.

Heavy deps (numpy, torch, sentence-transformers) are imported lazily so the
BM25 path and the unit tests stay stdlib-only.
"""

from __future__ import annotations

import os
import threading

from .config import RagConfig

_CFG = RagConfig.from_env()
PRIMARY = _CFG.embed_model
FALLBACK = _CFG.embed_fallback
QUERY_PREFIX = "task: question answering | query: "
VRAM_BUDGET_GB = _CFG.vram_gb
#: model card: EmbeddingGemma 2 needs sentence-transformers >= 6.1; older
#: releases silently build a mean-pooling model from the bare weights.
MIN_ST_VERSION = (6, 1)


def _version_tuple(v: str) -> tuple[int, ...]:
    out = []
    for part in v.split(".")[:3]:
        digits = "".join(ch for ch in part if ch.isdigit())
        out.append(int(digits or 0))
    return tuple(out)


def _offline(env=None) -> bool:
    env = os.environ if env is None else env
    return any(env.get(k, "").lower() in ("1", "true", "yes") for k in ("HF_HUB_OFFLINE", "TRANSFORMERS_OFFLINE"))


def model_cached(model_id: str) -> bool:
    """True when ``model_id`` is a local dir or its weights sit in the HF cache."""
    if os.path.isdir(model_id):
        return True
    try:
        from huggingface_hub import try_to_load_from_cache
    except ImportError:
        return False
    for name in ("model.safetensors", "pytorch_model.bin"):
        hit = try_to_load_from_cache(model_id, name)
        if isinstance(hit, str) and os.path.exists(hit):
            return True
    return False


def preflight(model_id: str, st_version: str | None = None, offline: bool | None = None, cached=model_cached):
    """Check the encoder can load *as specified* before trying.

    Returns ``(ok, reason)``. Fails (instead of degrading silently) when
    sentence-transformers is too old for the model, or when the hub is offline
    and the weights are not in the mounted cache.
    """
    if st_version is None:
        try:
            import sentence_transformers as st
            st_version = st.__version__
        except ImportError:
            return False, "sentence-transformers is not installed (dense retrieval unavailable)"
    if "embeddinggemma-2" in model_id and _version_tuple(st_version) < MIN_ST_VERSION:
        return False, (f"sentence-transformers {st_version} is too old for {model_id} "
                       f"(needs >= {'.'.join(map(str, MIN_ST_VERSION))}); refusing a mean-pooled load")
    if (_offline() if offline is None else offline) and not cached(model_id):
        return False, (f"{model_id} is not in the Hugging Face cache and the hub is offline; "
                       f"mount a pre-populated cache at $HF_HOME (see deploy/README)")
    return True, ""


def _cap_vram(torch) -> None:
    if torch.cuda.is_available():
        total = torch.cuda.get_device_properties(0).total_memory / 2**30
        frac = min(1.0, VRAM_BUDGET_GB / total)
        torch.cuda.set_per_process_memory_fraction(frac, 0)


def doc_text(title: str, body: str) -> str:
    return f"title: {title or 'none'} | text: {body}"


class DenseEncoder:
    def __init__(self, model_id: str | None = None, multimodal: bool = False, device: str | None = None,
                 fallback: str | None = None):
        model_id = model_id or PRIMARY
        fallback = FALLBACK if fallback is None else fallback
        self.fallback_reason = None
        ok, reason = preflight(model_id)
        if not ok:
            if not fallback:
                raise RuntimeError(reason)
            self.fallback_reason = reason
            ok2, reason2 = preflight(fallback)
            if not ok2:
                raise RuntimeError(f"{reason}; fallback {fallback}: {reason2}")
            model_id = fallback
        import torch
        from sentence_transformers import SentenceTransformer

        _cap_vram(torch)
        dev = device or ("cuda" if torch.cuda.is_available() else "cpu")
        dtype = torch.bfloat16 if dev == "cuda" else torch.float32
        kw = dict(model_kwargs={"dtype": dtype}, device=dev)
        if "embeddinggemma-2" in model_id and not multimodal:
            kw["config_kwargs"] = {"vision_config": None, "audio_config": None}
        try:
            self.model = SentenceTransformer(model_id, **kw)
            self.model_id = model_id
        except Exception as exc:  # unsupported arch / corrupt weights
            if not fallback or model_id == fallback:
                raise
            self.fallback_reason = f"{type(exc).__name__}: {str(exc)[:300]}"
            self.model = SentenceTransformer(fallback, model_kwargs={"dtype": dtype}, device=dev)
            self.model_id = fallback
        self.device = dev
        self._lock = threading.Lock()

    def encode_docs(self, texts: list[str], batch_size: int = _CFG.embed_batch):
        return self.model.encode(texts, batch_size=batch_size, normalize_embeddings=True,
                                 convert_to_numpy=True, show_progress_bar=False).astype("float32")

    def encode_queries(self, queries: list[str], batch_size: int = 64):
        with self._lock:
            return self._encode_queries(queries, batch_size)

    def _encode_queries(self, queries: list[str], batch_size: int):
        return self.model.encode([QUERY_PREFIX + q for q in queries], batch_size=batch_size,
                                 normalize_embeddings=True, convert_to_numpy=True,
                                 show_progress_bar=False).astype("float32")

    def encode_images(self, images: list, captions: list[str] | None = None):
        """Embed page images (optionally interleaved with a caption) into the shared space."""
        inputs = []
        for i, img in enumerate(images):
            if captions and captions[i]:
                inputs.append({"text": f"title: {captions[i]} | text: <|image|>", "image": [img]})
            else:
                inputs.append({"image": img})
        return self.model.encode(inputs, batch_size=4, normalize_embeddings=True,
                                 convert_to_numpy=True, show_progress_bar=False).astype("float32")


def truncate(mat, dim: int):
    """Matryoshka truncation with mandatory L2 re-normalisation."""
    import numpy as np

    if dim >= mat.shape[1]:
        return mat
    m = mat[:, :dim].astype("float32")
    n = np.linalg.norm(m, axis=1, keepdims=True)
    n[n == 0] = 1.0
    return m / n


def search(doc_mat, q_vec, k: int = 50) -> list[tuple[int, float]]:
    import numpy as np

    s = doc_mat @ q_vec
    k = min(k, s.shape[0])
    idx = np.argpartition(-s, k - 1)[:k]
    idx = idx[np.argsort(-s[idx])]
    return [(int(i), float(s[i])) for i in idx]
