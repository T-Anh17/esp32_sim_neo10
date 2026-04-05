#include "buzzer.h"

bool buzzerActive = false;

// KLJ-1230: passive piezo buzzer, resonant freq ~4100 Hz
// Sử dụng LEDC để tạo tín hiệu PWM thay vì tone() (ko hỗ trợ tốt trên ESP32-S3)
static bool _ledcAttached = false;

void buzzer_init() {
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
}

static void buzzer_on(uint32_t freq) {
  if (_ledcAttached) {
    ledcDetach(BUZZER_PIN);
    _ledcAttached = false;
  }
  if (ledcAttach(BUZZER_PIN, freq, 8)) { // 8-bit resolution
    _ledcAttached = true;
    ledcWrite(BUZZER_PIN, 128); // duty 50% -> square wave
  } else {
    Serial.println("[Buzzer] LEDC attach FAILED");
  }
}

static void buzzer_off() {
  if (_ledcAttached) {
    ledcWrite(BUZZER_PIN, 0);
    ledcDetach(BUZZER_PIN);
    _ledcAttached = false;
  }
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
}

void buzzer_beep(int duration, int times, int gap) {
  for (int i = 0; i < times; i++) {
    buzzer_on(BUZZER_FREQ);
    delay(duration);
    buzzer_off();
    delay(gap);
  }
}

void buzzer_sos() {
  while (buzzerActive) // chạy cho đến khi tắt
  {
    // 3 tiếng ngắn (S)
    for (int i = 0; i < 3; i++) {
      if (!buzzerActive)
        break;
      buzzer_beep(100, 1, 100);
      vTaskDelay(pdMS_TO_TICKS(10));
    }
    if (!buzzerActive)
      break;
    vTaskDelay(pdMS_TO_TICKS(200));

    // 3 tiếng dài (O)
    for (int i = 0; i < 3; i++) {
      if (!buzzerActive)
        break;
      buzzer_beep(400, 1, 100);
      vTaskDelay(pdMS_TO_TICKS(10));
    }
    if (!buzzerActive)
      break;
    vTaskDelay(pdMS_TO_TICKS(200));

    // 3 tiếng ngắn (S)
    for (int i = 0; i < 3; i++) {
      if (!buzzerActive)
        break;
      buzzer_beep(100, 1, 100);
      vTaskDelay(pdMS_TO_TICKS(10));
    }

    // nghỉ 1 giây rồi lặp lại
    for (int k = 0; k < 10; k++) {
      if (!buzzerActive)
        break;
      vTaskDelay(pdMS_TO_TICKS(100));
    }
  }

  // Khi thoát vòng lặp, đảm bảo tắt còi
  buzzer_off();
  Serial.println("[Buzzer] SOS Stopped");
}