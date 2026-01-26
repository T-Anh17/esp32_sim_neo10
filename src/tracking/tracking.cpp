#include "tracking.h"

#define DEVICE_ID "TRACKER_001"
#define SERVER_URL "https://gps-tracker.ahcntab.workers.dev/update"

extern bool sosIsActive();

unsigned long lastSendMS = 0;
static bool trackingEnabled = true;
static TaskHandle_t trackingTaskHandle = NULL;

void Tracking_Init()
{
    Serial.println("[TRACKING] Init");
}

void Tracking_SetEnabled(bool enabled)
{
    trackingEnabled = enabled;
}

void Tracking_Loop()
{
    if (!trackingEnabled || sosIsActive())
    {
        return;
    }

    // chỉ gửi mỗi 60 giây
    if (millis() - lastSendMS < 5000)
        return;
    lastSendMS = millis();

    // lấy GPS từ module hiện tại của bạn
    double lat = GPS_getLatitude();
    double lng = GPS_getLongitude();

    if (lat == 0 || lng == 0)
    {
        Serial.println("[TRACKING] Waiting GPS FIX...");
        return;
    }

    // format JSON
    String json = "{";
    json += "\"id\":\"" + String(DEVICE_ID) + "\",";
    json += "\"lat\":" + String(lat, 6) + ",";
    json += "\"lng\":" + String(lng, 6) + ",";
    json += "\"fix\":true";
    json += "}";

    Serial.println("[TRACKING] SEND JSON = " + json);

    // Gửi HTTP POST qua SIM7680C
    SIM7680C_httpPost(SERVER_URL, "application/json", json);
}

static void trackingTask(void *pvParameters)
{
    Tracking_Init();
    while (true)
    {
        Tracking_Loop();
        vTaskDelay(pdMS_TO_TICKS(200));
    }
}

void Tracking_StartTask()
{
    if (trackingTaskHandle != NULL)
    {
        return;
    }
    xTaskCreatePinnedToCore(trackingTask, "trackingTask", 4096, NULL, 1, &trackingTaskHandle, 0);
}
