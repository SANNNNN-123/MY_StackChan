# MY StackChan

Experiments StackChan control over USB serial on M5Stack CoreS3.


## Requirements

- PlatformIO
- Python 3

## Flash firmware

```bash
pio run -t upload
```

Update `upload_port` in `platformio.ini` if your device is not `/dev/ttyACM0`.

## Control options

**CLI**
```bash
python3 move.py 30 45          # X mov 30°, Y mov 45°
python3 move.py 0 0 --home
python3 move.py 0 0 --status
```

**Desktop UI**
```bash
python3 stackchan_ui.py
```

**Web UI**
```bash
python3 stackchan_joystick_server.py
# open http://127.0.0.1:8765
```

Only one app can use the serial port at a time.


## Demo

[▶ Watch demo on YouTube](https://youtube.com/shorts/GT8A3w2dUe8)