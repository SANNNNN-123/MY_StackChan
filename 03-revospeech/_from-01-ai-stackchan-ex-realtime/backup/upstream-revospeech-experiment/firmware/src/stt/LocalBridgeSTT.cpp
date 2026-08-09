#include "LocalBridgeSTT.h"

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>

String LocalBridgeSTT::speech_to_text() {
    AudioWhisper audio;
    Serial.println("LocalBridgeSTT: recording");
    audio.Record();

    WiFiClient client;
    HTTPClient http;
    if (!http.begin(client, param.stt_conf.model)) {
        Serial.println("LocalBridgeSTT: HTTP begin failed");
        return "";
    }
    http.setTimeout(120000);
    http.addHeader("Content-Type", "audio/wav");
    const int status = http.POST(
        const_cast<uint8_t*>(audio.GetBuffer()), audio.GetSize());
    if (status != HTTP_CODE_OK) {
        Serial.printf("LocalBridgeSTT: bridge HTTP status %d\n", status);
        http.end();
        return "";
    }

    const String body = http.getString();
    http.end();
    DynamicJsonDocument doc(1024);
    if (deserializeJson(doc, body)) {
        Serial.println("LocalBridgeSTT: invalid JSON response");
        return "";
    }
    const String text = doc["text"].as<String>();
    Serial.printf("LocalBridgeSTT: %s\n", text.c_str());
    return text;
}
