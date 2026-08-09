#pragma once

#include "STTBase.h"
#include "driver/AudioWhisper.h"

class LocalBridgeSTT : public STTBase {
public:
    explicit LocalBridgeSTT(stt_param_t param) : STTBase(param) {}
    String speech_to_text() override;
};
