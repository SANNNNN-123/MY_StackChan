# MY StackChan

This repository contains StackChan experiments, ordered by folder number.

## Projects

### `00-experiment-stackchan-servo-USB-serial`

A simple CoreS3 servo-control experiment over USB serial. It includes:

- PlatformIO firmware
- Python CLI control
- Desktop UI
- Browser-based joystick UI

Use this folder for local, direct movement testing without Wi‑Fi or OpenAI.

[Open the `00` README](./00-experiment-stackchan-servo-USB-serial/README.md)

### `01-ai-stackchan-ex-realtime`

An AI-enabled StackChan setup based on `AI_StackChan_Ex`. It connects the CoreS3 to the OpenAI Realtime API over Wi‑Fi and uses SPIFFS configuration instead of a microSD card.

Use this folder for voice interaction, firmware flashing, configuration, and future MCP integration.

[Open the `01` README](./01-ai-stackchan-ex-realtime/README.md)

## Getting started

Choose the project that matches your goal, then follow its README:

1. Start with `00` for USB-serial servo testing.
2. Use `01` for the AI Realtime firmware workflow.

Keep API keys, Wi‑Fi credentials, and other local secrets in the locations documented by the relevant project. Do not commit them.
