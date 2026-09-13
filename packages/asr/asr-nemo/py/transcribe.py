"""Transcribe one audio file with an AI4Bharat IndicConformer checkpoint.

Sidecar entry for `@deepseek-ai/dsh-asr-nemo`: the host spawns
`python3 py/transcribe.py --model <checkpoint> --audio <file>
--language <code>` and reads one JSON object from stdout. Engine setup
(AI4Bharat NeMo, `nemo-v2` branch) and the checkpoint download live outside
this file — see https://github.com/AI4Bharat/IndicConformerASR.

Stdout contract: `{"text": "<transcript>", "language": "<code>"}`.
Any failure exits non-zero with a one-line explanation on stderr; stdout
stays empty so the host never parses a half-written transcript.
"""

import argparse
import json
import sys


def parse_args(argv: list[str]) -> argparse.Namespace:
    """Define and parse the sidecar command line."""
    parser = argparse.ArgumentParser(description='Transcribe audio with IndicConformer.')
    parser.add_argument('--model', required=True, help='Local .nemo checkpoint path.')
    parser.add_argument('--audio', required=True, help='Audio file to transcribe.')
    parser.add_argument('--language', required=True, help='Language code to decode with.')
    return parser.parse_args(argv)


def decode_text(hypothesis: object) -> str:
    """Project one NeMo hypothesis to plain text.

    NeMo's `transcribe` return items differ across versions (plain strings
    versus hypothesis objects carrying `.text`), so accept both instead of
    pinning one release.
    """
    if isinstance(hypothesis, str):
        return hypothesis
    text = getattr(hypothesis, 'text', None)
    if isinstance(text, str):
        return text
    return str(hypothesis)


def main(argv: list[str]) -> int:
    """Run the transcription and report the JSON outcome."""
    args = parse_args(argv)
    try:
        from nemo.collections.asr.models import EncDecHybridRNNTCTCModel
    except ImportError:
        print(
            'asr-nemo: NeMo is not installed; install AI4Bharat NeMo (nemo-v2 branch).',
            file=sys.stderr,
        )
        return 2
    try:
        model = EncDecHybridRNNTCTCModel.restore_from(args.model)
        hypotheses = model.transcribe([args.audio])
    except Exception as error:  # Engine, checkpoint, or audio failure: report, don't trace.
        print(f'asr-nemo: transcription failed: {error}', file=sys.stderr)
        return 1
    if not hypotheses:
        print(json.dumps({'text': '', 'language': args.language}))
        return 0
    print(json.dumps({'text': decode_text(hypotheses[0]), 'language': args.language}))
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
