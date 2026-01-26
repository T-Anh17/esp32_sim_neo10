#include "main.h"

static portMUX_TYPE sosMux = portMUX_INITIALIZER_UNLOCKED;
static volatile int g_sosActiveCount = 0;

void sosEnter()
{
    portENTER_CRITICAL(&sosMux);
    g_sosActiveCount++;
    portEXIT_CRITICAL(&sosMux);
}

void sosExit()
{
    portENTER_CRITICAL(&sosMux);
    if (g_sosActiveCount > 0)
    {
        g_sosActiveCount--;
    }
    portEXIT_CRITICAL(&sosMux);
}

bool sosIsActive()
{
    return g_sosActiveCount > 0;
}

void setup()
{
    Serial.begin(115200);
    delay(200);

    initStorage();
    loadDataFromRom();
    buzzer_init();
    initFriendlyNamePortal();
    initWiFi();
    //Tracking_Init();
    Tracking_StartTask();

    // SIM & GPS task của bạn
    xTaskCreatePinnedToCore(task_init_sim7680c, "task_init_sim7680c", 8192, NULL, 1, &xHandle_sim7680c, 0);
    xTaskCreatePinnedToCore(gpsTask, "gpsTask", 8192, NULL, 1, &xHandle_gps, 1);
    xTaskCreate(buttonTask, "buttonTask", 4096, NULL, 1, NULL);
}

void loop()
{
    //Tracking_Loop();
    loopFriendlyNamePortal();
    vTaskDelay(16);
}
