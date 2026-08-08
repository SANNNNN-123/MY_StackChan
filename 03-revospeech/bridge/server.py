"""Local StackChan voice bridge.

Receives a WAV recording from the robot, sends it to OpenAI speech-to-text,
uses an OpenAI text model for the reply, and returns Malay WAV audio produced
by the local RevoSpeech VITS model.
"""

from __future__ import annotations

import json
import io
import logging
import os
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


def load_dotenv() -> None:
    """Load simple KEY=VALUE settings without adding a dotenv dependency."""
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


load_dotenv()

from openai import OpenAI
from revospeech import ASR, TTS

LOG = logging.getLogger("stackchan-bridge")
HOST = os.getenv("STACKCHAN_BRIDGE_HOST", "0.0.0.0")
PORT = int(os.getenv("STACKCHAN_BRIDGE_PORT", "8787"))
ASR_MODEL = os.getenv("REVOSPEECH_ASR_MODEL", "zipformer-v2")
TEXT_MODEL = os.getenv("OPENAI_TEXT_MODEL", "gpt-4o-mini")
SYSTEM_PROMPT = os.getenv(
    "STACKCHAN_SYSTEM_PROMPT",
    "You are the friendly voice assistant inside a StackChan robot. "
    "Reply naturally and briefly in Malay. Do not use markdown.",
)

OPENAI = OpenAI()
ASR_ENGINE = ASR(ASR_MODEL)
TTS_ENGINE = TTS("vits-ms")


def transcribe_audio(wav_bytes: bytes) -> str:
    return ASR_ENGINE.transcribe(io.BytesIO(wav_bytes)).text.strip()


def process_audio(wav_bytes: bytes) -> bytes:
    text = transcribe_audio(wav_bytes)
    if not text:
        raise ValueError("OpenAI returned an empty transcript")

    completion = OPENAI.chat.completions.create(
        model=TEXT_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text},
        ],
    )
    reply = (completion.choices[0].message.content or "").strip()
    if not reply:
        raise ValueError("OpenAI returned an empty reply")

    return audio_to_wav(TTS_ENGINE.synthesize(reply, speaker="sarah"))


def synthesize_text(text: str) -> bytes:
    audio = TTS_ENGINE.synthesize(text.strip(), speaker="sarah")
    return audio_to_wav(audio)


def audio_to_wav(audio) -> bytes:
    import soundfile as sf

    output = io.BytesIO()
    sf.write(output, audio.samples, audio.sample_rate, format="WAV", subtype="PCM_16")
    return output.getvalue()


class Handler(BaseHTTPRequestHandler):
    server_version = "StackChanBridge/0.1"

    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            self._send_json(200, {"ok": True, "tts": "local-vits-ms-sarah"})
        else:
            self._send_json(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path not in ("/v1/transcribe", "/v1/voice"):
            self._send_json(404, {"error": "not found"})
            return

        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > 512 * 1024:
            self._send_json(400, {"error": "expected a WAV body <= 512 KiB"})
            return

        try:
            wav_bytes = self.rfile.read(length)
            if self.path == "/v1/transcribe":
                transcript = transcribe_audio(wav_bytes)
                self._send_json(200, {"text": transcript, "model": ASR_MODEL})
                LOG.info("transcription completed: input=%d text=%r", length, transcript)
                return

            if self.headers.get("Content-Type", "").startswith("text/plain"):
                output = synthesize_text(wav_bytes.decode("utf-8"))
            else:
                output = process_audio(wav_bytes)
            self.send_response(200)
            self.send_header("Content-Type", "audio/wav")
            self.send_header("Content-Length", str(len(output)))
            self.end_headers()
            self.wfile.write(output)
            LOG.info("voice request completed: input=%d output=%d", length, len(output))
        except Exception as exc:  # bridge errors must be visible to the robot
            LOG.exception("voice request failed")
            self._send_json(500, {"error": str(exc)})

    def log_message(self, fmt: str, *args: object) -> None:
        LOG.info("%s - %s", self.address_string(), fmt % args)


def main() -> None:
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
    LOG.info("loading local Malay TTS model")
    LOG.info("bridge listening on http://%s:%d", HOST, PORT)
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
