#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <WiFi.h>
#include <Config.h>
#include <strip/strip.h>

void initWiFi();
void WiFiEvent(WiFiEvent_t event);

#endif