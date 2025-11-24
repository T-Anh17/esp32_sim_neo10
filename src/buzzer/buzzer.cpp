#include "buzzer.h"

void buzzer_init()
{
    pinMode(BUZZER_PIN, OUTPUT);   
    digitalWrite(BUZZER_PIN, LOW);
}


void buzzer_beep(int duration, int times, int gap)
{
    for (int i = 0; i < times; i++)
    {
        digitalWrite(BUZZER_PIN, HIGH);
        delay(duration);
        digitalWrite(BUZZER_PIN, LOW);
        delay(gap);
    }
}


void buzzer_sos()
{
    while (buzzerActive)  // chạy cho đến khi tắt
    {
        // ... (3 tiếng ngắn)
        for (int i = 0; i < 3 && buzzerActive; i++) {
            buzzer_beep(100, 1, 100);
            vTaskDelay(pdMS_TO_TICKS(10));
        }

        if (!buzzerActive) break;
        vTaskDelay(pdMS_TO_TICKS(200));

        // --- (3 tiếng dài)
        for (int i = 0; i < 3 && buzzerActive; i++) {
            buzzer_beep(400, 1, 200);
            vTaskDelay(pdMS_TO_TICKS(10));
        }

        if (!buzzerActive) break;
        vTaskDelay(pdMS_TO_TICKS(200));

        // ... (3 tiếng ngắn)
        for (int i = 0; i < 3 && buzzerActive; i++) {
            buzzer_beep(100, 1, 100);
            vTaskDelay(pdMS_TO_TICKS(10));
        }

        // nghỉ 1 giây rồi lặp lại
        vTaskDelay(pdMS_TO_TICKS(1000));
    }

    // Khi thoát vòng lặp, đảm bảo tắt còi
    digitalWrite(BUZZER_PIN, LOW);
}