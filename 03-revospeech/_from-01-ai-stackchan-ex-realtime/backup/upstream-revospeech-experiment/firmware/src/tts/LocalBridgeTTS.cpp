#include "LocalBridgeTTS.h"

#include <HTTPClient.h>
#include <M5Unified.h>
#include <WiFi.h>

namespace {
constexpr size_t MAX_WAV_BYTES = 2 * 1024 * 1024;
constexpr uint32_t BRIDGE_TIMEOUT_MS = 120000;

uint32_t read_le32(const uint8_t* p) {
    return static_cast<uint32_t>(p[0]) |
           (static_cast<uint32_t>(p[1]) << 8) |
           (static_cast<uint32_t>(p[2]) << 16) |
           (static_cast<uint32_t>(p[3]) << 24);
}

uint16_t read_le16(const uint8_t* p) {
    return static_cast<uint16_t>(p[0]) |
           (static_cast<uint16_t>(p[1]) << 8);
}
}

void LocalBridgeTTS::stream(String text) {
    if (text.length() == 0 || param.model.length() == 0) {
        Serial.println("LocalBridgeTTS: empty text or endpoint");
        return;
    }

    WiFiClient client;
    HTTPClient http;
    if (!http.begin(client, param.model)) {
        Serial.println("LocalBridgeTTS: HTTP begin failed");
        return;
    }

    // RevoSpeech may need several seconds to synthesize a longer reply.
    // HTTPClient's default timeout is too short for the complete POST/response.
    http.setTimeout(BRIDGE_TIMEOUT_MS);
    http.addHeader("Content-Type", "text/plain; charset=utf-8");
    const int status = http.POST(text);
    if (status != HTTP_CODE_OK) {
        Serial.printf("LocalBridgeTTS: bridge HTTP status %d\n", status);
        http.end();
        return;
    }

    const int length = http.getSize();
    if (length <= 44 || static_cast<size_t>(length) > MAX_WAV_BYTES) {
        Serial.printf("LocalBridgeTTS: invalid WAV size %d\n", length);
        http.end();
        return;
    }

    uint8_t* wav = static_cast<uint8_t*>(heap_caps_malloc(
        static_cast<size_t>(length), MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT));
    if (!wav) {
        Serial.println("LocalBridgeTTS: cannot allocate WAV buffer");
        http.end();
        return;
    }

    WiFiClient* stream = http.getStreamPtr();
    size_t received = 0;
    const uint32_t deadline = millis() + 30000;
    while (received < static_cast<size_t>(length) && millis() < deadline) {
        const size_t available = stream->available();
        if (available == 0) {
            delay(2);
            continue;
        }
        const size_t wanted = min(available, static_cast<size_t>(length) - received);
        const int read = stream->readBytes(wav + received, wanted);
        if (read <= 0) break;
        received += static_cast<size_t>(read);
    }
    http.end();

    if (received < 44 || memcmp(wav, "RIFF", 4) != 0 || memcmp(wav + 8, "WAVE", 4) != 0) {
        Serial.println("LocalBridgeTTS: response is not a RIFF/WAVE file");
        free(wav);
        return;
    }

    uint16_t channels = read_le16(wav + 22);
    uint16_t bits = read_le16(wav + 34);
    uint32_t sample_rate = read_le32(wav + 24);
    uint32_t data_offset = 44;
    uint32_t data_size = read_le32(wav + 40);
    if (channels != 1 || bits != 16 || data_offset + data_size > received) {
        Serial.printf("LocalBridgeTTS: unsupported WAV channels=%u bits=%u\n", channels, bits);
        free(wav);
        return;
    }

    M5.Mic.end();
    M5.Speaker.begin();
    M5.Speaker.playRaw(reinterpret_cast<int16_t*>(wav + data_offset),
                       data_size / sizeof(int16_t), sample_rate, false);
    while (M5.Speaker.isPlaying()) delay(10);
    M5.Speaker.end();
    M5.Mic.begin();
    free(wav);
}
