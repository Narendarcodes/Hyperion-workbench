"""Browser MediaRecorder sends WebM/Opus; libsndfile (librosa) cannot open it, so
every live composer clip got 422 'Format not recognised'. load_audio must fall
back to ffmpeg (STT_FFMPEG) and return 16 kHz mono float samples."""
import base64
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stt_server  # noqa: E402


@unittest.skipUnless(shutil.which('ffmpeg'), 'ffmpeg not installed')
class WebmDecode(unittest.TestCase):
    def test_webm_opus_bytes_decode_via_ffmpeg(self):
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, 'clip.webm')
            subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1.5',
                            '-c:a', 'libopus', path], check=True)
            data = open(path, 'rb').read()
        wav = stt_server.decode_audio_bytes(data)
        self.assertAlmostEqual(len(wav) / 16000, 1.5, delta=0.1)
        self.assertGreater(max(abs(float(x)) for x in wav[:4000]), 0.05)

    def test_load_audio_falls_back_when_soundfile_cannot_open(self):
        def broken(*_a, **_k):
            raise RuntimeError('Format not recognised')
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, 'clip.webm')
            subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=300:duration=1',
                            '-c:a', 'libopus', path], check=True)
            body = {'audio_b64': base64.b64encode(open(path, 'rb').read()).decode()}
        wav = stt_server.load_audio(body, primary=broken)
        self.assertAlmostEqual(len(wav) / 16000, 1.0, delta=0.1)


if __name__ == '__main__':
    unittest.main()
