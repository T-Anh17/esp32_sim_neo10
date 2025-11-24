#ifndef GPS_H
#define GPS_H

#include <Arduino.h>
#include <TinyGPSPlus.h>
#include "strip/strip.h"
#include "config.h"
#include "server.h"

#define GPS_RX_PIN 17
#define GPS_TX_PIN 18

extern TinyGPSPlus gps;
extern HardwareSerial SerialGPS;

void gpsTask(void *pvParameters);
String getGPSLink();
void injectToGPS(String bin);
String extractBinary(String raw);
double GPS_getLatitude();
double GPS_getLongitude();

// Tọa độ hiện tại
extern float currentLat;
extern float currentLng;

#endif
