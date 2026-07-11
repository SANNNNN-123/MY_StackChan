#include <Arduino.h>
#include <M5StackChan.h>

// Angle unit: 10 = 1 degree
// X (yaw):   -1280 .. 1280  (-128 deg .. 128 deg)
// Y (pitch): 0 .. 900       (0 deg .. 90 deg)

static constexpr uint32_t DISPLAY_INTERVAL_MS = 250;

static int clampX(int v) { return max(-1280, min(1280, v)); }
static int clampY(int v) { return max(0, min(900, v)); }

static const char *chargeStatusText(m5::Power_Class::is_charging_t state) {
  switch (state) {
    case m5::Power_Class::is_charging:
      return "Charging";
    case m5::Power_Class::is_discharging:
      return "Discharging";
    default:
      return "Unknown";
  }
}

static void drawSeparator(LGFX_Device &display, int y) {
  display.drawFastHLine(0, y, display.width(), TFT_DARKGREY);
}

static constexpr uint8_t DISPLAY_TEXT_SIZE = 2;
static constexpr int DISPLAY_LINE_H = 8 * DISPLAY_TEXT_SIZE;

static void drawDashboard() {
  int32_t level = M5.Power.getBatteryLevel();
  auto charge_state = M5.Power.isCharging();
  float voltage = M5StackChan.getBatteryVoltage();
  float current_ma = M5StackChan.getBatteryCurrent() * 1000.0f;
  float yaw_deg = M5StackChan.Motion.getCurrentXAngle() / 10.0f;
  float pitch_deg = M5StackChan.Motion.getCurrentYAngle() / 10.0f;
  bool moving = M5StackChan.Motion.isMoving();

  auto &display = M5StackChan.Display();
  display.fillScreen(TFT_BLACK);
  display.setTextSize(DISPLAY_TEXT_SIZE);

  int y = 4;
  display.setTextColor(TFT_WHITE, TFT_BLACK);
  display.setCursor(0, y);
  display.println("USB motor");

  y += DISPLAY_LINE_H + 4;
  drawSeparator(display, y);

  y += 6;
  display.setCursor(0, y);
  if (level < 0) {
    display.setTextColor(TFT_ORANGE, TFT_BLACK);
    display.printf("Battery: N/A  %s\n", chargeStatusText(charge_state));
  } else {
    uint16_t level_color = TFT_GREEN;
    if (charge_state == m5::Power_Class::is_charging) {
      level_color = TFT_CYAN;
    } else if (level <= 20) {
      level_color = TFT_RED;
    } else if (level <= 40) {
      level_color = TFT_YELLOW;
    }
    display.setTextColor(level_color, TFT_BLACK);
    display.printf("Battery: %ld%%  %s\n", (long)level, chargeStatusText(charge_state));
  }

  y += DISPLAY_LINE_H;
  display.setTextColor(TFT_WHITE, TFT_BLACK);
  display.setCursor(0, y);
  display.printf("%.2fV  %+.0fmA\n", voltage, current_ma);

  y += DISPLAY_LINE_H + 4;
  drawSeparator(display, y);

  y += 6;
  display.setCursor(0, y);
  display.printf("X mov: %.1f deg\n", yaw_deg);

  y += DISPLAY_LINE_H;
  display.setCursor(0, y);
  display.printf("Y mov: %.1f deg\n", pitch_deg);

  y += DISPLAY_LINE_H;
  display.setTextColor(moving ? TFT_YELLOW : TFT_GREEN, TFT_BLACK);
  display.setCursor(0, y);
  display.println(moving ? "Moving" : "Idle");
}

static void printHelp() {
  Serial.println("StackChan USB motor control");
  Serial.println("  move <x> <y>       move using raw units (x:-1280..1280, y:0..900)");
  Serial.println("  deg <x_deg> <y_deg> move using degrees");
  Serial.println("  home               return to home position");
  Serial.println("  status             print current angles");
  Serial.println("  help               show this message");
}

static void printStatus() {
  Serial.printf("x=%d y=%d (%.1f deg, %.1f deg)\n", M5StackChan.Motion.getCurrentXAngle(),
                M5StackChan.Motion.getCurrentYAngle(),
                M5StackChan.Motion.getCurrentXAngle() / 10.0f,
                M5StackChan.Motion.getCurrentYAngle() / 10.0f);
}

static void handleLine(char *line) {
  while (*line == ' ' || *line == '\t') line++;
  if (*line == '\0') return;

  char cmd[16] = {};
  if (sscanf(line, "%15s", cmd) != 1) return;

  if (strcmp(cmd, "help") == 0 || strcmp(cmd, "?") == 0) {
    printHelp();
    return;
  }

  if (strcmp(cmd, "home") == 0) {
    M5StackChan.Motion.goHome();
    Serial.println("ok home");
    return;
  }

  if (strcmp(cmd, "status") == 0) {
    printStatus();
    return;
  }

  if (strcmp(cmd, "move") == 0) {
    int x = 0;
    int y = 0;
    if (sscanf(line, "%*s %d %d", &x, &y) != 2) {
      Serial.println("err usage: move <x> <y>");
      return;
    }
    x = clampX(x);
    y = clampY(y);
    M5StackChan.Motion.move(x, y);
    Serial.printf("ok move %d %d\n", x, y);
    return;
  }

  if (strcmp(cmd, "deg") == 0) {
    float x_deg = 0.0f;
    float y_deg = 0.0f;
    if (sscanf(line, "%*s %f %f", &x_deg, &y_deg) != 2) {
      Serial.println("err usage: deg <x_deg> <y_deg>");
      return;
    }
    int x = clampX((int)lroundf(x_deg * 10.0f));
    int y = clampY((int)lroundf(y_deg * 10.0f));
    M5StackChan.Motion.move(x, y);
    Serial.printf("ok deg %.1f %.1f -> %d %d\n", x_deg, y_deg, x, y);
    return;
  }

  Serial.printf("err unknown command: %s\n", cmd);
}

void setup() {
  Serial.begin(115200);
  delay(1500);

  M5StackChan.begin();
  drawDashboard();

  Serial.println();
  Serial.println("--- StackChan USB Motor Ready ---");
  printHelp();
}

void loop() {
  M5StackChan.update();

  static uint32_t last_display_ms = 0;
  uint32_t now = millis();
  if (now - last_display_ms >= DISPLAY_INTERVAL_MS) {
    last_display_ms = now;
    drawDashboard();
  }

  static char line[96];
  static size_t len = 0;

  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\r') continue;

    if (c == '\n') {
      line[len] = '\0';
      handleLine(line);
      len = 0;
      continue;
    }

    if (len + 1 < sizeof(line)) {
      line[len++] = c;
    }
  }
}
