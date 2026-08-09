#pragma once

#include "TTSBase.h"

class LocalBridgeTTS : public TTSBase {
public:
    explicit LocalBridgeTTS(tts_param_t param) : TTSBase(param) {}
    void stream(String text) override;
};
