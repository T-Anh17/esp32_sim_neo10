#include "WiFi.h"

void WiFiEvent(WiFiEvent_t event)
{
    printf("[WiFi-event] %d\n", event);
    switch (event)
    {
    case ARDUINO_EVENT_WIFI_STA_GOT_IP:
        printf("[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
        break;

    case ARDUINO_EVENT_WIFI_AP_START:
        printf("[WiFi] AP Started! SSID: %s\n", WiFi.softAPSSID().c_str());
        break;

    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
        printf("[WiFi] STA Disconnected!\n");
        break;

    default:
        break;
    }
}

void initWiFi()
{
    WiFi.mode(WIFI_MODE_APSTA); // ⭐ Quan trọng: AP + STA đồng thời

    WiFi.setSleep(WIFI_PS_NONE);
    WiFi.persistent(false);
    WiFi.setAutoReconnect(true);
    WiFi.onEvent(WiFiEvent);

    // ==============================
    // 1️⃣ Khởi động AP
    // ==============================
    const char *AP_SSID = "ESP32-SETUP";
    const char *AP_PASS = "12345678";

    bool ap_ok = WiFi.softAP(AP_SSID, AP_PASS);
    if (ap_ok)
        printf("[AP] Started! IP: %s\n", WiFi.softAPIP().toString().c_str());
    else
        printf("[AP] Failed to start!\n");

    // ==============================
    // 2️⃣ Kết nối router (STA)
    // ==============================
    printf("[STA] Connecting to SSID: %s\n", SSID_Name);
    WiFi.begin(SSID_Name, SSID_Password);

    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 8000)
    {
        delay(400);
        printf(".");
    }

    if (WiFi.status() == WL_CONNECTED)
        printf("\n[STA] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    else
        printf("\n[STA] Failed!\n");
}
