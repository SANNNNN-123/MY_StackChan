#!/usr/bin/env python3
"""Serve a web joystick UI and bridge commands to StackChan over USB serial."""

from __future__ import annotations

import argparse
import glob
import json
import re
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

import serial

BAUD = 115200
DEFAULT_PORT = "/dev/ttyACM0"
YAW_MIN, YAW_MAX = -128.0, 128.0
PITCH_MIN, PITCH_MAX = 0.0, 90.0
RESPONSE_PREFIXES = ("ok ", "err ", "x=")
STATUS_RE = re.compile(
    r"x=(?P<x>-?\d+)\s+y=(?P<y>\d+)\s+\((?P<x_deg>[-\d.]+)\s+deg,\s+(?P<y_deg>[-\d.]+)\s+deg\)"
)
WEB_DIR = Path(__file__).resolve().parent / "web"


def ui_yaw_to_firmware(yaw: float) -> float:
    return -yaw


def firmware_yaw_to_ui(yaw: float) -> float:
    return -yaw


def list_serial_ports() -> list[str]:
    ports = sorted(glob.glob("/dev/ttyACM*") + glob.glob("/dev/ttyUSB*"))
    if DEFAULT_PORT not in ports:
        ports.insert(0, DEFAULT_PORT)
    return ports


class StackChanSerial:
    READ_TIMEOUT = 0.3

    def __init__(self) -> None:
        self._ser: serial.Serial | None = None
        self._lock = threading.Lock()

    @property
    def connected(self) -> bool:
        return self._ser is not None and self._ser.is_open

    def connect(self, port: str) -> None:
        self.disconnect()
        self._ser = serial.Serial(port, BAUD, timeout=self.READ_TIMEOUT)
        self._ser.reset_input_buffer()

    def disconnect(self) -> None:
        if self._ser is not None:
            try:
                self._ser.close()
            except serial.SerialException:
                pass
            self._ser = None

    def send_command(self, cmd: str, *, wait: bool = True) -> list[str]:
        if not self.connected:
            raise serial.SerialException("Not connected")

        with self._lock:
            assert self._ser is not None
            self._ser.reset_input_buffer()
            self._ser.write(f"{cmd}\n".encode("ascii"))
            self._ser.flush()

            if not wait:
                return []

            lines: list[str] = []
            while True:
                raw = self._ser.readline()
                if not raw:
                    break
                line = raw.decode("utf-8", errors="replace").strip()
                if not line:
                    continue
                lines.append(line)
                if line.startswith(RESPONSE_PREFIXES):
                    break
            return lines


class StackChanJoystickServer(ThreadingHTTPServer):
    allow_reuse_address = True

    def __init__(self, server_address: tuple[str, int], handler_cls: type[BaseHTTPRequestHandler]) -> None:
        super().__init__(server_address, handler_cls)
        self.client = StackChanSerial()


class JoystickHandler(BaseHTTPRequestHandler):
    server: StackChanJoystickServer

    def log_message(self, format: str, *args) -> None:
        return

    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        data = self.rfile.read(length)
        return json.loads(data.decode("utf-8"))

    def _serve_file(self, path: Path, content_type: str) -> None:
        if not path.is_file():
            self._send_json(404, {"error": "Not found"})
            return
        body = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        route = urlparse(self.path).path
        if route in ("/", "/index.html"):
            self._serve_file(WEB_DIR / "index.html", "text/html; charset=utf-8")
            return
        if route == "/joy.js":
            self._serve_file(WEB_DIR / "joy.js", "application/javascript; charset=utf-8")
            return
        if route == "/api/ports":
            self._send_json(200, {"ports": list_serial_ports()})
            return
        if route == "/api/status":
            self._handle_status()
            return
        self._send_json(404, {"error": "Not found"})

    def do_POST(self) -> None:
        route = urlparse(self.path).path
        try:
            payload = self._read_json()
        except json.JSONDecodeError:
            self._send_json(400, {"error": "Invalid JSON"})
            return

        if route == "/api/connect":
            self._handle_connect(payload)
        elif route == "/api/disconnect":
            self._handle_disconnect()
        elif route == "/api/move":
            self._handle_move(payload)
        elif route == "/api/home":
            self._handle_home()
        else:
            self._send_json(404, {"error": "Not found"})

    def _handle_connect(self, payload: dict) -> None:
        port = str(payload.get("port", DEFAULT_PORT)).strip()
        try:
            self.server.client.connect(port)
        except serial.SerialException as exc:
            self._send_json(500, {"error": str(exc)})
            return
        self._send_json(200, {"ok": True, "port": port})

    def _handle_disconnect(self) -> None:
        self.server.client.disconnect()
        self._send_json(200, {"ok": True})

    def _handle_move(self, payload: dict) -> None:
        if not self.server.client.connected:
            self._send_json(409, {"error": "Not connected"})
            return

        try:
            yaw = float(payload.get("yaw", 0.0))
            pitch = float(payload.get("pitch", 45.0))
        except (TypeError, ValueError):
            self._send_json(400, {"error": "yaw and pitch must be numbers"})
            return

        yaw = max(YAW_MIN, min(YAW_MAX, yaw))
        pitch = max(PITCH_MIN, min(PITCH_MAX, pitch))
        yaw = ui_yaw_to_firmware(yaw)

        try:
            self.server.client.send_command(f"deg {yaw:.1f} {pitch:.1f}", wait=False)
        except serial.SerialException as exc:
            self._send_json(500, {"error": str(exc)})
            return

        self._send_json(200, {"ok": True, "yaw": firmware_yaw_to_ui(yaw), "pitch": pitch})

    def _handle_home(self) -> None:
        if not self.server.client.connected:
            self._send_json(409, {"error": "Not connected"})
            return
        try:
            self.server.client.send_command("home", wait=False)
        except serial.SerialException as exc:
            self._send_json(500, {"error": str(exc)})
            return
        self._send_json(200, {"ok": True})

    def _handle_status(self) -> None:
        if not self.server.client.connected:
            self._send_json(409, {"error": "Not connected"})
            return
        try:
            lines = self.server.client.send_command("status", wait=True)
        except serial.SerialException as exc:
            self._send_json(500, {"error": str(exc)})
            return

        if not lines:
            self._send_json(500, {"error": "No response from device"})
            return

        match = STATUS_RE.search(lines[-1])
        if not match:
            self._send_json(500, {"error": lines[-1]})
            return

        yaw = firmware_yaw_to_ui(float(match.group("x_deg")))
        pitch = float(match.group("y_deg"))
        self._send_json(200, {"ok": True, "yaw": yaw, "pitch": pitch, "raw": lines[-1]})


def main() -> None:
    parser = argparse.ArgumentParser(description="StackChan web joystick server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()

    try:
        server = StackChanJoystickServer((args.host, args.port), JoystickHandler)
    except OSError as exc:
        if exc.errno == 98:
            print(f"Port {args.port} is already in use.")
            print("Stop the other server (Ctrl+C) or run:")
            print(f"  python3 stackchan_joystick_server.py --port {args.port + 1}")
            raise SystemExit(1) from exc
        raise

    print(f"StackChan joystick: http://{args.host}:{args.port}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping...")
    finally:
        server.client.disconnect()
        server.server_close()


if __name__ == "__main__":
    main()
