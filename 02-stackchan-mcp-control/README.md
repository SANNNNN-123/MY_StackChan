# 02 : StackChan MCP Control

Draft experiment for giving StackChan access to tools through the Model Context Protocol (MCP).

## Goal

Let StackChan call tools on a Linux or Windows computer, starting with browser control:

```text
StackChan → OpenAI Realtime → MCP SSE bridge → browser MCP → host browser
```

Example command:

```text
Open YouTube and play Baby Shark.
```

## Planned setup

The StackChan MCP client currently expects legacy SSE:

```text
GET  http://<host-ip>:8000/sse
POST http://<host-ip>:8000/message
```

Run a browser MCP server on the host computer and expose it through Supergateway.

Fedora/Linux:

```bash
npx -y supergateway \
  --stdio "npx -y @playwright/mcp@latest --browser=chromium" \
  --port 8000 \
  --baseUrl http://<fedora-lan-ip>:8000
```

Windows PowerShell:

```powershell
npx -y supergateway --stdio "npx -y @playwright/mcp@latest --browser=chromium" --port 8000 --baseUrl http://<windows-lan-ip>:8000
```

Then add the server to `SC_ExConfig.yaml`:

```yaml
mcpServers:
  [
    {
      "name": "browser",
      "disabled": false,
      "url": "<host-lan-ip>",
      "port": 8000
    }
  ]
```

Apply the config from experiment `01` with:

```bash
cd ../01-ai-stackchan-ex-realtime
./scripts/apply-local-config.sh
./scripts/flash.sh
```

## Notes

- The Fedora/Windows host and StackChan must be on the same LAN.
- Use the host LAN IP, never `127.0.0.1`.
- Keep the browser MCP server private; it can control logged-in browser sessions.
- Browser playback comes from the host speakers, not StackChan’s speaker.
- This folder is a draft; implementation and testing are still pending.
