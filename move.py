#!/usr/bin/env python3
"""Send angle commands to StackChan over USB serial."""

import argparse
import sys

import serial


def main() -> int:
    parser = argparse.ArgumentParser(description="Move StackChan head over USB serial")
    parser.add_argument("x", type=float, help="yaw in degrees (left/right)")
    parser.add_argument("y", type=float, help="pitch in degrees (up/down, 0-90)")
    parser.add_argument("--port", default="/dev/ttyACM0")
    parser.add_argument("--home", action="store_true", help="go home instead of moving")
    parser.add_argument("--status", action="store_true", help="print current angles")
    args = parser.parse_args()

    with serial.Serial(args.port, 115200, timeout=2) as ser:
        ser.reset_input_buffer()
        if args.home:
            cmd = "home\n"
        elif args.status:
            cmd = "status\n"
        else:
            cmd = f"deg {args.x} {args.y}\n"

        ser.write(cmd.encode("ascii"))
        ser.flush()

        lines = []
        while True:
            line = ser.readline().decode("utf-8", errors="replace").strip()
            if not line:
                break
            lines.append(line)

    for line in lines:
        print(line)

    if not lines:
        print("No response. Is usb_motor firmware flashed?", file=sys.stderr)
        return 1

    return 0 if lines[-1].startswith("ok") or lines[-1].startswith("x=") else 1


if __name__ == "__main__":
    raise SystemExit(main())
