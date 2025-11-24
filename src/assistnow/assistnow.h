#pragma once
#include <Arduino.h>
#include <HardwareSerial.h>

bool downloadAssistNow();
bool injectAssistNow(HardwareSerial &gps);
