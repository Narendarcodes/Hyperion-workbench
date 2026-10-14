"""Dense retrieval with EmbeddingGemma 2 (falls back to EmbeddingGemma 300M).

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

PRIMARY = "google/embeddinggemma-2"
FALLBACK = "google/embeddinggemma-300m"
QUERY_PREFIX = "task: question answering | query: "
VRAM_BUDGET_GB = float(os.environ.get("HYPERION_RAG_VRAM_GB", "6"))


def _cap_vram(torch) -> None:
    if torch.cuda.is_available():
        total = torch.cuda.get_device_properties(0).total_memory / 2**30
        frac = min(1.0, VRAM_BUDGET_GB / total)
        torch.cuda.set_per_process_memory_fraction(frac, 0)


def doc_text(title: str, body: str) -> str:
    return f"title: {title or 'none'} | text: {body}"


class DenseEncoder:
    def __init__(self, model_id: str = PRIMARY, multimodal: bool = False, device: str | None = None):
        import torch
        from sentence_transformers import SentenceTransformer

        _cap_vram(torch)
        dev = device or ("cuda" if torch.cuda.is_available() else "cpu")
        dtype = torch.bfloat16 if dev == "cuda" else torch.float32
        cfg = {} if multimodal else {"vision_config": None, "audio_config": None}
        self.fallback_reason = None
        try:
            kw = dict(model_kwargs={"torch_dtype": dtype}, device=dev)
            if model_id == PRIMARY:
                kw["config_kwargs"] = cfg
            self.model = SentenceTransformer(model_id, **kw)
            self.model_id = model_id
        except Exception as exc:  # gated / unavailable / unsupported arch
            if model_id != PRIMARY:
                raise
            self.fallback_reason = f"{type(exc).__name__}: {str(exc)[:300]}"
            self.model = SentenceTransformer(FALLBACK, model_kwargs={"torch_dtype": dtype}, device=dev)
            self.model_id = FALLBACK
        self.device = dev
        self._lock = threading.Lock()

    def encode_docs(self, texts: list[str], batch_size: int = int(os.environ.get("HYPERION_RAG_EMBED_BATCH", "16"))):
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
