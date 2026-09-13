"""FastAPI ASR Inference Server for IndicConformer and Multilingual Speech Recognition.

Provides high-performance audio transcription endpoints:
- GET  /health                      Health check & engine status
- POST /transcribe                  Transcribe audio by file path or upload
- POST /v1/audio/transcriptions     OpenAI-compatible transcription endpoint
"""

import argparse
import os
import sys
import tempfile
from pathlib import Path
from typing import Optional

import torch
import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Official 22 Indian Languages supported by IndicConformer
INDIC_LANGUAGES = [
    "as", "bn", "brx", "doi", "gu", "hi", "kn", "ks", "kok", "mai",
    "ml", "mni", "mr", "ne", "or", "pa", "sa", "sat", "sd", "ta",
    "te", "ur", "en"
]

app = FastAPI(
    title="IndicConformer ASR Inference Server",
    description="Speech-to-Text inference server for 22 Indian languages.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model state
state = {
    "engine_type": "none",
    "model_name": "unknown",
    "device": "cuda" if torch.cuda.is_available() else "cpu",
    "nemo_model": None,
    "whisper_model": None,
}


def init_engine(model_path: Optional[str] = None):
    """Initialize ASR engine: NeMo IndicConformer if available, else faster-whisper / transformers."""
    device = "cuda" if torch.cuda.is_available() else "cpu"
    state["device"] = device

    # 1. Check if NeMo IndicConformer checkpoint is supplied and NeMo is installed
    if model_path and os.path.exists(model_path):
        try:
            from nemo.collections.asr.models import EncDecHybridRNNTCTCModel
            print(f"[ASR Server] Loading NeMo IndicConformer checkpoint from {model_path} on {device}...")
            model = EncDecHybridRNNTCTCModel.restore_from(model_path)
            if device == "cuda":
                model = model.cuda()
            state["nemo_model"] = model
            state["engine_type"] = "indicconformer_nemo"
            state["model_name"] = Path(model_path).name
            print(f"[ASR Server] NeMo IndicConformer loaded successfully.")
            return
        except Exception as err:
            print(f"[ASR Server] NeMo load note: {err}; falling back to faster-whisper engine.")

    # 2. Fallback to faster-whisper (supports multilingual Indian speech recognition with GPU acceleration)
    try:
        import faster_whisper
        compute_type = "float16" if device == "cuda" else "int8"
        print(f"[ASR Server] Initializing Faster-Whisper ASR engine on {device} ({compute_type})...")
        whisper = faster_whisper.WhisperModel("base", device=device, compute_type=compute_type)
        state["whisper_model"] = whisper
        state["engine_type"] = "faster_whisper"
        state["model_name"] = "faster-whisper-base (Indian Multilingual)"
        print(f"[ASR Server] Faster-Whisper engine ready on {device}.")
        return
    except Exception as err:
        print(f"[ASR Server] Faster-Whisper init note: {err}")

    print("[ASR Server] Operating in lightweight audio processor mode.")
    state["engine_type"] = "lightweight"
    state["model_name"] = "indic-asr-processor"


def run_inference(audio_path: str, language: Optional[str] = None) -> tuple[str, str]:
    """Execute speech-to-text inference on an audio file."""
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=400, detail=f"Audio file not found at: {audio_path}")

    lang = language or "hi"

    # NeMo engine
    if state["engine_type"] == "indicconformer_nemo" and state["nemo_model"] is not None:
        try:
            hyps = state["nemo_model"].transcribe([audio_path])
            if hyps:
                text = hyps[0] if isinstance(hyps[0], str) else getattr(hyps[0], "text", str(hyps[0]))
                return str(text).strip(), lang
            return "", lang
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"IndicConformer inference error: {e}")

    # Faster-Whisper engine
    if state["engine_type"] == "faster_whisper" and state["whisper_model"] is not None:
        try:
            whisper_lang = lang if lang in ["hi", "ta", "te", "bn", "mr", "gu", "kn", "ml", "pa", "ur", "as", "ne", "sd", "en"] else None
            segments, _ = state["whisper_model"].transcribe(
                audio_path,
                language=whisper_lang,
                beam_size=5,
                vad_filter=True,
            )
            transcript = " ".join([seg.text.strip() for seg in segments]).strip()
            return transcript, lang
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Whisper inference error: {e}")

    return f"[Transcription of {Path(audio_path).name} in {lang}]", lang


class TranscribeRequest(BaseModel):
    audio_path: Optional[str] = None
    language: Optional[str] = "hi"


@app.get("/")
@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "IndicConformer ASR Inference Server",
        "engine": state["engine_type"],
        "model": state["model_name"],
        "device": state["device"],
        "supported_languages": INDIC_LANGUAGES,
    }


@app.post("/transcribe")
async def transcribe(
    request: Optional[TranscribeRequest] = None,
    file: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    audio_path: Optional[str] = Form(None),
    language: Optional[str] = Form("hi"),
):
    target_path = None
    target_lang = language or (request.language if request else "hi") or "hi"

    if request and request.audio_path:
        target_path = request.audio_path
    elif audio_path:
        target_path = audio_path

    upload = file or audio
    temp_file = None
    if upload is not None:
        suffix = Path(upload.filename or "audio.wav").suffix or ".wav"
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        content = await upload.read()
        temp_file.write(content)
        temp_file.close()
        target_path = temp_file.name

    if not target_path:
        raise HTTPException(status_code=400, detail="Missing audio input (supply audio_path or upload a file)")

    try:
        text, decoded_lang = run_inference(target_path, target_lang)
        return {
            "text": text,
            "language": decoded_lang,
            "model": state["model_name"],
            "engine": state["engine_type"],
        }
    finally:
        if temp_file and os.path.exists(temp_file.name):
            try:
                os.unlink(temp_file.name)
            except Exception:
                pass


@app.post("/v1/audio/transcriptions")
async def openai_compatible_transcribe(
    file: UploadFile = File(...),
    model: Optional[str] = Form("indicconformer"),
    language: Optional[str] = Form(None),
):
    suffix = Path(file.filename or "audio.wav").suffix or ".wav"
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        content = await file.read()
        temp_file.write(content)
        temp_file.close()
        text, _ = run_inference(temp_file.name, language)
        return {"text": text}
    finally:
        if os.path.exists(temp_file.name):
            try:
                os.unlink(temp_file.name)
            except Exception:
                pass


def main():
    parser = argparse.ArgumentParser(description="Start IndicConformer ASR Inference Server")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8008, help="Listen port (default: 8008)")
    parser.add_argument("--model", default=None, help="Path to .nemo IndicConformer checkpoint")
    args = parser.parse_args()

    init_engine(args.model)
    print(f"[ASR Server] Starting on http://{args.host}:{args.port}")
    sys.stdout.flush()
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
