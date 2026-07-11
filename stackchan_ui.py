#!/usr/bin/env python3
"""GUI for controlling StackChan head motors over USB serial."""

from __future__ import annotations

import glob
import queue
import re
import threading
import tkinter as tk
from tkinter import messagebox, ttk

import serial

BAUD = 115200
YAW_MIN, YAW_MAX = -128.0, 128.0
PITCH_MIN, PITCH_MAX = 0.0, 90.0
DEFAULT_PORT = "/dev/ttyACM0"
RESPONSE_PREFIXES = ("ok ", "err ", "x=")


def ui_yaw_to_firmware(yaw: float) -> float:
    """Invert yaw so UI left/right matches physical movement."""
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


class StackChanUI(tk.Tk):
  STATUS_RE = re.compile(
      r"x=(?P<x>-?\d+)\s+y=(?P<y>\d+)\s+\((?P<x_deg>[-\d.]+)\s+deg,\s+(?P<y_deg>[-\d.]+)\s+deg\)"
  )

  def __init__(self) -> None:
      super().__init__()
      self.title("StackChan Control")
      self._apply_display_scaling()

      self.client = StackChanSerial()
      self._work_queue: queue.Queue[tuple[str, object]] = queue.Queue()
      self._busy = False

      self.yaw_var = tk.DoubleVar(value=0.0)
      self.pitch_var = tk.DoubleVar(value=45.0)
      self.live_var = tk.BooleanVar(value=False)
      self.port_var = tk.StringVar(value=DEFAULT_PORT)

      self._configure_styles()
      self._build_ui()
      self._fit_window_to_content()
      self._refresh_ports(select_default=True)
      self.protocol("WM_DELETE_WINDOW", self._on_close)
      self.after(100, self._poll_queue)

  def _apply_display_scaling(self) -> None:
      try:
          dpi = self.winfo_fpixels("1i")
          if dpi > 96:
              self.tk.call("tk", "scaling", dpi / 96.0)
      except tk.TclError:
          pass

  def _configure_styles(self) -> None:
      style = ttk.Style(self)
      style.configure("Title.TLabel", font=("TkDefaultFont", 18, "bold"))
      style.configure("Subtitle.TLabel", font=("TkDefaultFont", 11), foreground="#555555")
      style.configure("Section.TLabelframe.Label", font=("TkDefaultFont", 11, "bold"))
      style.configure("Pad.TButton", font=("TkDefaultFont", 14), padding=(10, 8))
      style.configure("Action.TButton", padding=(10, 6))
      style.configure("TButton", padding=(8, 5))

  def _fit_window_to_content(self) -> None:
      self.update_idletasks()

      screen_w = self.winfo_screenwidth()
      screen_h = self.winfo_screenheight()
      content_w = self.outer.winfo_reqwidth()
      content_h = self.outer.winfo_reqheight()

      width = min(max(content_w + 48, 700), int(screen_w * 0.95))
      height = min(max(content_h + 96, 760), int(screen_h * 0.95))
      x = max(0, (screen_w - width) // 2)
      y = max(0, (screen_h - height) // 2)

      self.minsize(min(width, 680), min(height, 720))
      self.geometry(f"{width}x{height}+{x}+{y}")

  def _build_ui(self) -> None:
      self.outer = ttk.Frame(self, padding=20)
      self.outer.pack(fill=tk.BOTH, expand=True)

      title = ttk.Label(self.outer, text="StackChan USB Control", style="Title.TLabel")
      title.pack(anchor=tk.W)

      subtitle = ttk.Label(
          self.outer,
          text="Yaw: left/right   Pitch: up/down",
          style="Subtitle.TLabel",
      )
      subtitle.pack(anchor=tk.W, pady=(4, 16))

      conn = ttk.LabelFrame(self.outer, text="Connection", padding=14, style="Section.TLabelframe")
      conn.pack(fill=tk.X, pady=(0, 14))

      port_row = ttk.Frame(conn)
      port_row.pack(fill=tk.X)

      ttk.Label(port_row, text="Port").pack(side=tk.LEFT)
      self.port_combo = ttk.Combobox(
          port_row,
          textvariable=self.port_var,
          state="readonly",
          width=24,
      )
      self.port_combo.pack(side=tk.LEFT, padx=(8, 8))

      ttk.Button(port_row, text="Refresh", command=self._refresh_ports).pack(side=tk.LEFT)

      self.connect_btn = ttk.Button(conn, text="Connect", command=self._toggle_connection)
      self.connect_btn.pack(anchor=tk.W, pady=(10, 0))

      self.conn_status = ttk.Label(conn, text="Disconnected", foreground="#b00020")
      self.conn_status.pack(anchor=tk.W, pady=(6, 0))

      controls = ttk.LabelFrame(self.outer, text="Head Position", padding=14, style="Section.TLabelframe")
      controls.pack(fill=tk.X, pady=(0, 14))

      self._add_slider(
          controls,
          "Yaw (degrees)",
          self.yaw_var,
          YAW_MIN,
          YAW_MAX,
          1.0,
      )
      self._add_slider(
          controls,
          "Pitch (degrees)",
          self.pitch_var,
          PITCH_MIN,
          PITCH_MAX,
          1.0,
      )

      ttk.Checkbutton(
          controls,
          text="Live update while dragging",
          variable=self.live_var,
      ).pack(anchor=tk.W, pady=(8, 0))

      actions = ttk.Frame(self.outer)
      actions.pack(fill=tk.X, pady=(0, 14))

      ttk.Button(actions, text="Move", style="Action.TButton", command=self._send_move).pack(side=tk.LEFT)
      ttk.Button(actions, text="Home", style="Action.TButton", command=self._send_home).pack(side=tk.LEFT, padx=(10, 0))
      ttk.Button(actions, text="Status", style="Action.TButton", command=self._send_status).pack(side=tk.LEFT, padx=(10, 0))
      ttk.Button(actions, text="Center", style="Action.TButton", command=self._center_sliders).pack(side=tk.LEFT, padx=(10, 0))

      pad = ttk.LabelFrame(self.outer, text="Quick Pad", padding=14, style="Section.TLabelframe")
      pad.pack(fill=tk.X, pady=(0, 14))

      pad_grid = ttk.Frame(pad)
      pad_grid.pack()

      pad_buttons = [
          ("↖", -30, 60),
          ("↑", 0, 75),
          ("↗", 30, 60),
          ("←", -45, 45),
          ("●", 0, 45),
          ("→", 45, 45),
          ("↙", -30, 20),
          ("↓", 0, 15),
          ("↘", 30, 20),
      ]

      for idx, (label, yaw, pitch) in enumerate(pad_buttons):
          ttk.Button(
              pad_grid,
              text=label,
              width=5,
              style="Pad.TButton",
              command=lambda y=yaw, p=pitch: self._preset(y, p),
          ).grid(row=idx // 3, column=idx % 3, padx=6, pady=6)

      log_frame = ttk.LabelFrame(self.outer, text="Log", padding=10, style="Section.TLabelframe")
      log_frame.pack(fill=tk.BOTH, expand=True)

      self.log = tk.Text(log_frame, height=6, wrap=tk.WORD, state=tk.DISABLED, font=("TkFixedFont", 10))
      self.log.pack(fill=tk.BOTH, expand=True)

  def _add_slider(
      self,
      parent: ttk.Frame,
      label: str,
      variable: tk.DoubleVar,
      minimum: float,
      maximum: float,
      resolution: float,
  ) -> None:
      frame = ttk.Frame(parent)
      frame.pack(fill=tk.X, pady=(0, 12))

      header = ttk.Frame(frame)
      header.pack(fill=tk.X)

      ttk.Label(header, text=label, font=("TkDefaultFont", 11)).pack(side=tk.LEFT)
      value_label = ttk.Label(header, text="0.0", font=("TkDefaultFont", 11, "bold"))
      value_label.pack(side=tk.RIGHT)

      def on_change(_value: str) -> None:
          value_label.config(text=f"{variable.get():.1f}")
          if self.live_var.get() and self.client.connected:
              self._send_move()

      scale = ttk.Scale(
          frame,
          from_=minimum,
          to=maximum,
          variable=variable,
          orient=tk.HORIZONTAL,
          length=420,
          command=on_change,
      )
      scale.pack(fill=tk.X, pady=(6, 0))

  def _log_line(self, text: str) -> None:
      self.log.config(state=tk.NORMAL)
      self.log.insert(tk.END, text + "\n")
      self.log.see(tk.END)
      self.log.config(state=tk.DISABLED)

  def _refresh_ports(self, select_default: bool = False) -> None:
      ports = list_serial_ports()
      self.port_combo["values"] = ports
      if select_default and DEFAULT_PORT in ports:
          self.port_var.set(DEFAULT_PORT)
      elif ports and self.port_var.get() not in ports:
          self.port_var.set(ports[0])

  def _set_connected_ui(self, connected: bool) -> None:
      if connected:
          self.connect_btn.config(text="Disconnect")
          self.conn_status.config(text=f"Connected to {self.port_var.get()}", foreground="#1b5e20")
          self.port_combo.config(state="disabled")
      else:
          self.connect_btn.config(text="Connect")
          self.conn_status.config(text="Disconnected", foreground="#b00020")
          self.port_combo.config(state="readonly")

  def _toggle_connection(self) -> None:
      if self.client.connected:
          self.client.disconnect()
          self._set_connected_ui(False)
          self._log_line("Disconnected")
          return

      port = self.port_var.get().strip()
      if not port:
          messagebox.showerror("Connection", "Select a serial port first.")
          return

      try:
          self.client.connect(port)
      except serial.SerialException as exc:
          messagebox.showerror("Connection failed", str(exc))
          return

      self._set_connected_ui(True)
      self._log_line(f"Connected on {port}")
      self._send_status()

  def _run_async(self, label: str, fn) -> None:
      if self._busy:
          return
      if not self.client.connected:
          messagebox.showwarning("Not connected", "Connect to StackChan first.")
          return

      self._busy = True

      def worker() -> None:
          try:
              result = fn()
              self._work_queue.put(("ok", (label, result)))
          except serial.SerialException as exc:
              self._work_queue.put(("error", str(exc)))

      threading.Thread(target=worker, daemon=True).start()

  def _poll_queue(self) -> None:
      while True:
          try:
              kind, payload = self._work_queue.get_nowait()
          except queue.Empty:
              break

          self._busy = False
          if kind == "error":
              self._log_line(f"Error: {payload}")
              if "not connected" in str(payload).lower() or "device" in str(payload).lower():
                  self.client.disconnect()
                  self._set_connected_ui(False)
          else:
              label, lines = payload
              for line in lines:
                  self._log_line(f"[{label}] {line}")
              if label == "status" and lines:
                  self._apply_status_line(lines[-1])

      self.after(100, self._poll_queue)

  def _apply_status_line(self, line: str) -> None:
      match = self.STATUS_RE.search(line)
      if not match:
          return
      self.yaw_var.set(firmware_yaw_to_ui(float(match.group("x_deg"))))
      self.pitch_var.set(float(match.group("y_deg")))

  def _send_move(self) -> None:
      if not self.client.connected:
          messagebox.showwarning("Not connected", "Connect to StackChan first.")
          return

      yaw = ui_yaw_to_firmware(self.yaw_var.get())
      pitch = self.pitch_var.get()

      try:
          self.client.send_command(f"deg {yaw:.1f} {pitch:.1f}", wait=False)
      except serial.SerialException as exc:
          self._log_line(f"Error: {exc}")
          self.client.disconnect()
          self._set_connected_ui(False)

  def _send_home(self) -> None:
      if not self.client.connected:
          messagebox.showwarning("Not connected", "Connect to StackChan first.")
          return

      try:
          self.client.send_command("home", wait=False)
      except serial.SerialException as exc:
          self._log_line(f"Error: {exc}")
          self.client.disconnect()
          self._set_connected_ui(False)
          return

      self.yaw_var.set(0.0)
      self.pitch_var.set(45.0)

  def _send_status(self) -> None:
      def fn() -> list[str]:
          return self.client.send_command("status")

      self._run_async("status", fn)

  def _preset(self, yaw: float, pitch: float) -> None:
      self.yaw_var.set(yaw)
      self.pitch_var.set(pitch)
      self._send_move()

  def _center_sliders(self) -> None:
      self.yaw_var.set(0.0)
      self.pitch_var.set(45.0)
      if self.client.connected:
          self._send_move()

  def _on_close(self) -> None:
      self.client.disconnect()
      self.destroy()


def main() -> None:
    app = StackChanUI()
    app.mainloop()


if __name__ == "__main__":
    main()
