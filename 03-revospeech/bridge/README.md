# StackChan local voice bridge

This service keeps the StackChan firmware hardware path intact while moving
the voice pipeline to the Mac:

```text
StackChan WAV -> local RevoSpeech ASR -> StackChan/OpenAI text model -> local RevoSpeech TTS -> WAV
```

## Run

From the repository root:

```bash
uv pip install -e . openai
# Edit ../.env and set OPENAI_API_KEY before starting.
uv run python bridge/server.py
```

The model directory must contain:

```text
hf-dl/speakers/sarah/model.onnx
hf-dl/speakers/sarah/model.onnx.json
```

Install `espeak-ng` on macOS if it is not already installed:

```bash
brew install espeak-ng
```

Check the service from another device on the LAN:

```bash
curl http://MAC_LAN_IP:8787/health
```

The firmware TTS URL is `http://MAC_LAN_IP:8787/v1/voice`.

The firmware ASR URL is `http://MAC_LAN_IP:8787/v1/transcribe`.

The checked-in `zipformer-v2` manifest currently describes an English model.
Set `REVOSPEECH_ASR_MODEL` to the name of a compatible bilingual model if you
have registered one locally.
