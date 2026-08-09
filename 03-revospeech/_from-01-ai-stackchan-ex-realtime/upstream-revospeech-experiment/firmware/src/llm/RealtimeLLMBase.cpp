#if defined(REALTIME_API)

#include <Arduino.h>
#include <M5Unified.h>
#include <Avatar.h>
#include "share/Mutex.h"
//#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include "rootCA/rootCAgoogleGemini.h"
#include <ArduinoJson.h>
#include "SpiRamJsonDocument.h"
#include "RealtimeLLMBase.h"
//#include "FunctionCall.h"
//#include "MCPClient.h"
#include "Robot.h"

#include <base64.h>
#include "libb64/cdecode.h"
#include <WebSocketsClient.h>
#include "esp_heap_caps.h"

using namespace m5avatar;
extern Avatar avatar;

int16_t rtRecBuf[RT_REC_LENGTH];    // リアルタイム録音用メモリ
                                    // Core2だとヒープが不足するので静的な配列とした
int16_t rtResampledBuf[RT_REC_LENGTH * RT_AUDIO_SAMPLE_RATE / RT_REC_SAMPLE_RATE];

TaskHandle_t webSocketLoopTask_h = NULL;

// WebSocketのイベント処理(webSocket.loop())及び、録音データ（約0.1秒）を
// WebSocketで送信するためのループタスク
void webSocketLoopTask(void *arg) {
    Serial.println("WebSocket loop task created");
    RealtimeLLMBase* pThis = (RealtimeLLMBase*)arg;

    while(1){
        pThis->webSocketProcess();
        //delay(1);     //webSocketProcess()内で状態によってスリープ時間を変更
    }
}


RealtimeLLMBase::RealtimeLLMBase(llm_param_t param) : 
    LLMBase(param, 0),
    msgDoc(0),
    rtRecSamplerate(RT_REC_SAMPLE_RATE),
    rtRecLength(RT_REC_LENGTH),
    realtime_recording(false),
    response_done(false),
    startTime(0),
    audioLevel(0),
    audioQueuedBytes(0),
    audioChunksReceived(0),
    audioChunksDropped(0),
    audioQueuePeak(0),
    outputText(String(""))
{
#ifdef REALTIME_API_RECORD_TEST
  // リアルタイム録音のチャンクデータを蓄積してテスト再生するためのバッファ（約4s）
  recTestLenMax = rtRecLength * 40;
  recTestLenCnt = 0;
  recTestBuf = (int16_t*)heap_caps_malloc(recTestLenMax * sizeof(*rtRecBuf), MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
#endif

#ifndef REALTIME_API_WITH_TTS
  audioFreeQueue = xQueueCreate(RT_AUDIO_QUEUE_LENGTH, sizeof(uint8_t*));
  audioReadyQueue = xQueueCreate(RT_AUDIO_QUEUE_LENGTH, sizeof(AudioChunk));
  for(int i = 0; i < RT_AUDIO_QUEUE_LENGTH; i++){
    audioBuf[i] = (uint8_t*)heap_caps_malloc(RT_AUDIO_CHUNK_SIZE + 1, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
    if(audioBuf[i] == nullptr){
      Serial.printf("Audio buffer allocation failed: %d\n", i);
      continue;
    }
    memset(audioBuf[i], 0, RT_AUDIO_CHUNK_SIZE + 1);
    xQueueSend(audioFreeQueue, &audioBuf[i], 0);
  }
  xTaskCreate(audioPlaybackTask, "audioPlaybackTask", 4096, this, 3, nullptr);
#endif

}

void RealtimeLLMBase::webSocketProcess()
{
    webSocket.loop();

#ifdef REALTIME_API_WITH_TTS
    if(response_done && !speaking){
        startRealtimeRecord();
        response_done = false;
    }
#endif

    if(realtime_recording){
        enterMutexAudio();
        //M5.Mic.begin();
        if(!M5.Mic.record(rtRecBuf, rtRecLength, rtRecSamplerate)){
            Serial.println("Mic.record() returns false");
            delay(1000);
        }
        //M5.Mic.end();
        exitMutexAudio();
        String audio_base64;
        const int resampledLength = rtRecLength * RT_AUDIO_SAMPLE_RATE / RT_REC_SAMPLE_RATE;
        for(int i = 0; i < resampledLength; i++){
            const float sourcePosition = (float)i * RT_REC_SAMPLE_RATE / RT_AUDIO_SAMPLE_RATE;
            const int sourceIndex = (int)sourcePosition;
            const float fraction = sourcePosition - sourceIndex;
            const int16_t first = rtRecBuf[sourceIndex];
            const int16_t second = rtRecBuf[(sourceIndex + 1 < rtRecLength) ? sourceIndex + 1 : sourceIndex];
            rtResampledBuf[i] = (int16_t)(first + (second - first) * fraction);
        }
        audio_base64 = base64::encode((u8*)rtResampledBuf, resampledLength * sizeof(int16_t));

#ifdef REALTIME_API_RECORD_TEST
        if((recTestLenCnt + rtRecLength) < recTestLenMax){
            memcpy((u8*)&recTestBuf[recTestLenCnt], (u8*)rtRecBuf, rtRecLength * sizeof(int16_t));
            recTestLenCnt += rtRecLength;
        }
#else
        String audioJsonBuf("");
        webSocket.sendTXT(buildInputAudioJson(audioJsonBuf, audio_base64));
#endif

        portTickType elapsedTime = checkRealtimeRecordTimeout();

#if 0   //Debug リスニング経過時間の表示
        static char speechTxt[64];
        sprintf(speechTxt, "Listening:%ds", int(elapsedTime / 1000));
        avatar.setSpeechText(speechTxt);
#else
        avatar.setSpeechText("Listening...");
#endif
        delay(1);
    }
    else{
        if(speaking){
            //発話中もしくはテキスト生成中
            avatar.setSpeechText("");
            resetRealtimeRecordStartTime(); //長いテキストを発話中にタイムアウトしてしまうのを防ぐ
            delay(1);
        }
        else{
            avatar.setSpeechText("Please touch");
            delay(10);
        }
    }
}

int RealtimeLLMBase::getAudioLevel()
{
    return audioLevel;
}

void RealtimeLLMBase::startRealtimeRecord()
{
    if(!realtime_recording){
        Serial.println("Start realtime recording");
        realtime_recording = true;
        startTime = xTaskGetTickCount();
    }
}

void RealtimeLLMBase::stopRealtimeRecord()
{
    if(realtime_recording){
        Serial.println("Stop realtime recording");
        realtime_recording = false;
        startTime = 0;
    }
}

void RealtimeLLMBase::resetRealtimeRecordStartTime()
{
    startTime = xTaskGetTickCount();
}

portTickType RealtimeLLMBase::checkRealtimeRecordTimeout()
{
    portTickType elapsedTime;
    elapsedTime = (xTaskGetTickCount() - startTime) * portTICK_RATE_MS;
    if(elapsedTime > REALTIME_RECORD_TIMEOUT){
        Serial.println("Realtime recording timeout");
        stopRealtimeRecord();
#ifdef REALTIME_API_RECORD_TEST
        M5.Mic.end();
        if (M5.Speaker.begin())
        {
            M5.Speaker.playRaw(recTestBuf, recTestLenCnt, rtRecSamplerate);
            while (M5.Speaker.isPlaying()) { delay(10); }
            M5.Speaker.end();
            M5.Mic.begin();
        }
        recTestLenCnt = 0;
#endif
    }

    return elapsedTime;
}

int RealtimeLLMBase::base64_decode(const char* input, int size, char* output)
{
	/* keep track of our decoded position */
	char* c = output;
	/* store the number of bytes decoded by a single call */
	int cnt = 0;
	/* we need a decoder state */
	base64_decodestate s;
	
	/*---------- START DECODING ----------*/
	/* initialise the decoder state */
	base64_init_decodestate(&s);
	/* decode the input data */
	cnt = base64_decode_block(input, strlen(input), c, &s);
	c += cnt;
	/* note: there is no base64_decode_blockend! */
	/*---------- STOP DECODING  ----------*/
	
	/* we want to print the decoded data, so null-terminate it: */
	*c = 0;
	
	return cnt;
}


void RealtimeLLMBase::hexdump(const void *mem, uint32_t len, uint8_t cols) {
	const uint8_t* src = (const uint8_t*) mem;
	Serial.printf("\n[HEXDUMP] Address: 0x%08X len: 0x%X (%d)", (ptrdiff_t)src, len, len);
	for(uint32_t i = 0; i < len; i++) {
		if(i % cols == 0) {
			Serial.printf("\n[0x%08X] 0x%08X: ", (ptrdiff_t)src, i);
		}
		Serial.printf("%02X ", *src);
		src++;
	}
	Serial.printf("\n");
}


void RealtimeLLMBase::streamAudioDelta(String& delta)
{
    uint8_t* buf = nullptr;
    // Apply backpressure instead of dropping audio when playback is temporarily behind.
    if(xQueueReceive(audioFreeQueue, &buf, portMAX_DELAY) != pdTRUE || buf == nullptr){
        audioChunksDropped++;
        return;
    }

    int len = base64_decode(delta.c_str(), delta.length(), (char*)buf);
    if(len <= 0 || len > RT_AUDIO_CHUNK_SIZE){
        xQueueSend(audioFreeQueue, &buf, 0);
        audioChunksDropped++;
        return;
    }

    AudioChunk chunk = {buf, (size_t)len};
    if(xQueueSend(audioReadyQueue, &chunk, 0) != pdTRUE){
        xQueueSend(audioFreeQueue, &buf, 0);
        audioChunksDropped++;
        return;
    }
    audioChunksReceived++;
    audioQueuedBytes += len;
    const uint32_t queueDepth = uxQueueMessagesWaiting(audioReadyQueue);
    if(queueDepth > audioQueuePeak){
        audioQueuePeak = queueDepth;
    }
}

void RealtimeLLMBase::audioPlaybackTask(void *arg)
{
    RealtimeLLMBase* self = (RealtimeLLMBase*)arg;
    AudioChunk chunk;
    bool prebuffering = true;
    TickType_t prebufferStart = xTaskGetTickCount();
    TickType_t reportTime = prebufferStart;
    const size_t prebufferBytes = RT_AUDIO_SAMPLE_RATE * 2 * RT_AUDIO_PREBUFFER_MS / 1000;

    while(true){
        if(prebuffering){
            const TickType_t now = xTaskGetTickCount();
            if(self->audioQueuedBytes == 0){
                prebufferStart = now;
                vTaskDelay(1);
                continue;
            }
            const bool bufferReady = self->audioQueuedBytes >= prebufferBytes;
            const bool bufferTimedOut = (now - prebufferStart) >= pdMS_TO_TICKS(300);
            if(!bufferReady && !bufferTimedOut){
                vTaskDelay(1);
                continue;
            }
            prebuffering = false;
        }

        if(xQueueReceive(self->audioReadyQueue, &chunk, portMAX_DELAY) == pdTRUE){
            self->audioQueuedBytes -= chunk.length;
            self->audioLevel = abs(((int16_t*)chunk.buffer)[0]) * 50;
            M5.Speaker.playRaw((int16_t*)chunk.buffer, chunk.length / 2, RT_AUDIO_SAMPLE_RATE, false);
            while(M5.Speaker.isPlaying()){
                vTaskDelay(1);
            }
            self->audioLevel = 0;
            xQueueSend(self->audioFreeQueue, &chunk.buffer, portMAX_DELAY);
            if(uxQueueMessagesWaiting(self->audioReadyQueue) == 0){
                prebuffering = true;
                prebufferStart = xTaskGetTickCount();
            }
        }

        const TickType_t now = xTaskGetTickCount();
        if(now - reportTime >= pdMS_TO_TICKS(5000)){
            Serial.printf("[Audio] received=%lu dropped=%lu queue_peak=%lu\n",
                          self->audioChunksReceived,
                          self->audioChunksDropped,
                          self->audioQueuePeak);
            reportTime = now;
        }
    }
}

void RealtimeLLMBase::invokeWebSocketLoopTask(void)
{
    xTaskCreate(webSocketLoopTask, /* Function to implement the task */
            "webSocketLoopTask", /* Name of the task */
            6*1024,               /* Stack size in words */
            this,                 /* Task input parameter */
            3,                    /* Priority of the task */
            &webSocketLoopTask_h);                /* Task handle. */
}

void RealtimeLLMBase::suspendWebSocketLoopTask(void)
{
    if (eTaskGetState(webSocketLoopTask_h) != eSuspended) {
      Serial.println("webSocketLoopTask Suspend");
      vTaskSuspend(webSocketLoopTask_h);
    }
}

void RealtimeLLMBase::resumeWebSocketLoopTask(void)
{
    if (eTaskGetState(webSocketLoopTask_h) == eSuspended) {
      Serial.println("webSocketLoopTask Resume");
      vTaskResume(webSocketLoopTask_h);
    }
}

#endif  //REALTIME_API
