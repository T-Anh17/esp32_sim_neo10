#pragma once
#include <Arduino.h>
#include <HardwareSerial.h>
#include <GPS/gps.h>
#include "../buzzer/buzzer.h"
#include "Config.h"

extern HardwareSerial simSerial;

#define MCU_SIM_BAUDRATE 115200
#define SIM_TX_PIN 15
#define SIM_RX_PIN 16

void init_sim7680c();
void SIM7680C_sendSMS(const String &message);
void task_init_sim7680c(void *pvParameters);
void SIM7680C_call();
bool waitOK(uint32_t timeout);
void SIM7680C_httpPost(const String &url, const String &contentType, const String &body);
void SIM7680C_mqttSend(const String &payload);
String readAll(uint32_t timeout);
