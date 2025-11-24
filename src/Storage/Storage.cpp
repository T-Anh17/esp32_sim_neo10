#include "Storage.h"
#include <Arduino.h>

void initStorage()
{
    esp_err_t err = nvs_flash_init();
    if (err != ESP_OK)
    {
        printf("Error initializing flash memory\n");
        ESP.restart();
        return;
    }

    err = nvs_open("storage", NVS_READWRITE, &nvsHandle);
    if (err != ESP_OK)
    {
        printf("Error opening flash storage\n");
        ESP.restart();
    }
}

void loadDataFromRom()
{
    esp_err_t err = nvs_flash_init();
    if (err != ESP_OK)
    {
        Serial.println("Error initializing flash memory");
        ESP.restart();
        return;
    }

    err = nvs_open("storage", NVS_READWRITE, &nvsHandle);
    if (err != ESP_OK)
    {
        Serial.println("Error opening flash storage");
        ESP.restart();
    }

    size_t dataSize = sizeof(PHONE);
    err = nvs_get_str(nvsHandle, "PHONE", PHONE, &dataSize);
    if (err != ESP_OK)
    {
        Serial.println("Error reading PHONE from flash");
        strncpy(PHONE, PHONE_NUMBER, sizeof(PHONE) - 1);
        PHONE[sizeof(PHONE) - 1] = '\0';
    }

    dataSize = sizeof(SMS);
    err = nvs_get_str(nvsHandle, "SMS", SMS, &dataSize);
    if (err != ESP_OK)
    {
        Serial.println("Error reading SMS from flash");
        strncpy(SMS, SMS_TEXT, sizeof(SMS) - 1);
        SMS[sizeof(SMS) - 1] = '\0';
    }

    dataSize = sizeof(GPS_LAT);
    err = nvs_get_blob(nvsHandle, "GPS_LAT", &GPS_LAT, &dataSize);
    if (err != ESP_OK)
    {
        Serial.println("Error reading GPS_LAT from flash");
        GPS_LAT = atof(GPS_LOCAL_LAT);
    }

    dataSize = sizeof(GPS_LNG);
    err = nvs_get_blob(nvsHandle, "GPS_LNG", &GPS_LNG, &dataSize);
    if (err != ESP_OK)
    {
        Serial.println("Error reading GPS_LNG from flash");
        GPS_LNG = atof(GPS_LOCAL_LNG);
    }
}

void saveDataToRom(const String &phone, const String &sms)
{
    strncpy(PHONE, phone.c_str(), sizeof(PHONE) - 1);
    PHONE[sizeof(PHONE) - 1] = '\0';

    strncpy(SMS, sms.c_str(), sizeof(SMS) - 1);
    SMS[sizeof(SMS) - 1] = '\0';

    nvs_set_str(nvsHandle, "PHONE", PHONE);
    nvs_set_str(nvsHandle, "SMS", SMS);
    nvs_commit(nvsHandle);

    Serial.printf("[NVS] Saved PHONE=%s | SMS=%s\n", PHONE, SMS);
}
