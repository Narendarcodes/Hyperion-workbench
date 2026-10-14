"""Cross-encoder reranking (default ``BAAI/bge-reranker-v2-m3``, Apache-2.0).

Scores are passed through a sigmoid so they are comparable across queries;
the abstention gate uses the top score. Lazy heavy imports.
"""

from __future__ import annotations

import math
import os
import threading

DEFAULT_RERANKER = "BAAI/bge-reranker-v2-m3"


class Reranker:
    def __init__(self, model_id: str = DEFAULT_RERANKER, device: str | None = None, max_length: int = 1024):
        import torch
        from sentence_transformers import CrossEncoder

        from .dense import _cap_vram

        _cap_vram(torch)
        dev = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model = CrossEncoder(model_id, device=dev, max_length=max_length,
                                  model_kwargs={"torch_dtype": torch.bfloat16 if dev == "cuda" else torch.float32})
        self.model_id = model_id
        self._lock = threading.Lock()  # one GPU batch at a time keeps VRAM inside the budget

    def score(self, query: str, passages: list[str],
              batch_size: int = int(os.environ.get("HYPERION_RAG_RERANK_BATCH", "16"))) -> list[float]:
        if not passages:
            return []
        with self._lock:
            raw = self._predict(query, passages, batch_size)
        return [1 / (1 + math.exp(-float(x))) for x in raw]

    def _predict(self, query: str, passages: list[str], batch_size: int):
        return self.model.predict([(query, p) for p in passages], batch_size=batch_size,
                                  show_progress_bar=False, activation_fn=None)
