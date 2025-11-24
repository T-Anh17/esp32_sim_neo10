#include "button.h"

TaskHandle_t buttonTaskHandle = NULL;
bool buzzerActive = false;

void buttonTask(void *pvParameters)
{
    Serial.println("[Button] Task started!");
    pinMode(BUTTON_PIN, INPUT_PULLUP);

    bool lastState = HIGH;
    unsigned long pressedTime = 0;

    // ---- double click state ----
    int clickCount = 0;
    unsigned long lastClickTime = 0;
    const unsigned long doubleClickGap = 400; // ms
    // -----------------------------

    while (true)
    {
        bool state = digitalRead(BUTTON_PIN);

        // Nhấn xuống
        if (state == LOW && lastState == HIGH)
        {
            pressedTime = millis();
        }

        // Nhả nút
        if (state == HIGH && lastState == LOW)
        {
            unsigned long pressDuration = millis() - pressedTime;

            // =====================================
            // ⭐ CASE 1 — CLICK (nhả nhanh < 300ms)
            // =====================================
            if (pressDuration < 300)
            {
                clickCount++;

                if (clickCount == 1)
                {
                    lastClickTime = millis(); // chờ xem có click lần 2 không
                }
                else if (clickCount == 2 &&
                         (millis() - lastClickTime) < doubleClickGap)
                {
                    // ======= DOUBLE CLICK =======
                    Serial.println("[Button] Double Click → CALLING...");

                    xTaskCreatePinnedToCore([](void *)
                                            {
                                                SIM7680C_call();
                                                vTaskDelete(NULL); },
                                            "callTask", 4096, NULL, 1, NULL, 1);

                    clickCount = 0;
                }

                // Vào chế độ chờ double-click
                lastState = state;
                vTaskDelay(pdMS_TO_TICKS(50));
                continue;
            }

            // =====================================
            // ⭐ CASE 2 — NHẤN GIỮ (1–3 giây)
            // =====================================
            if (pressDuration >= 1000 && pressDuration <= 3000)
            {
                // Đảm bảo KHÔNG xử lý nếu trước đó đã tính là click
                if (clickCount == 0)
                {
                    Serial.println("[Button] Press 1–3s → Send SMS");

                    String link = getGPSLink();
                    Serial.println(link);

                    xTaskCreatePinnedToCore([](void *param)
                                            {
                                                String msg = *(String *)param;
                                                SIM7680C_sendSMS(msg);
                                                delete (String *)param;
                                                vTaskDelete(NULL); },
                                            "smsTask",
                                            4096,
                                            new String(link),
                                            1,
                                            NULL,
                                            1);

                    buzzer_beep(200, 1, 100);
                }
            }

            // =====================================
            // ⭐ CASE 3 — NHẤN GIỮ >3 GIÂY
            // =====================================
            if (pressDuration > 3000)
            {
                if (clickCount == 0)
                {
                    buzzerActive = !buzzerActive;

                    if (buzzerActive)
                    {
                        Serial.println("[Button] Long Press >3s → SOS ON");

                        xTaskCreatePinnedToCore([](void *)
                                                {
                                                    buzzer_sos();
                                                    vTaskDelete(NULL); },
                                                "buzzerSOS", 4096, NULL, 1, NULL, 0);
                    }
                    else
                    {
                        Serial.println("[Button] SOS OFF");
                        digitalWrite(BUZZER_PIN, LOW);
                    }
                }
            }

            // Reset click counter nếu quá thời gian double click
            if (millis() - lastClickTime > doubleClickGap)
            {
                clickCount = 0;
            }
        }

        lastState = state;
        vTaskDelay(pdMS_TO_TICKS(20)); // debounce mượt hơn
    }
}
