#pragma once
#include <Arduino.h>

#define BUZZER_PIN 44
#define BUZZER_FREQ 4100  // KLJ-1230 resonant frequency
void buzzer_init();
void buzzer_beep(int duration = 100, int times = 1, int gap = 100);
void buzzer_sos();
extern bool buzzerActive; // biến điều khiển từ buttonTask
