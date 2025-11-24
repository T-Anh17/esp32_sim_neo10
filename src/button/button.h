#ifndef BUTTON_H
#define BUTTON_H

#include <Arduino.h>
#include "GPS/gps.h"
#include "../DATAEG/SIM7680C.h"
#include "../server.h"
#include "../buzzer/buzzer.h"

#define BUTTON_PIN 4 // GPIO 4
struct SmsData
{
    String phone;
    String message;
};

extern QueueHandle_t smsQueue;
void buttonTask(void *para);
void smsTask(void *pvParameters);
#endif
