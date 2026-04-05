#ifndef GPS_H
#define GPS_H

#include "Config.h"
#include "server.h"
#include <Arduino.h>
#include <TinyGPSPlus.h>

#define GPS_RX_PIN 12
#define GPS_TX_PIN 13

extern TinyGPSPlus gps;
extern HardwareSerial SerialGPS;

void gpsTask(void *pvParameters);
String getGPSLink();
double GPS_getLatitude();
double GPS_getLongitude();

// Inject approximate position into NEO-M10 (UBX-MGA-INI-POS-LLH)
// Only injects if lat/lng are non-zero. Accuracy in meters.
void GPS_injectApproxPosition(double lat, double lng, uint32_t accuracyM);

// Inject approximate UTC time into NEO-M10 (UBX-MGA-INI-TIME-UTC)
// Only injects if year >= 2024. Accuracy in milliseconds.
void GPS_injectApproxTime(int year, int month, int day,
                          int hour, int minute, int second,
                          uint32_t accuracyMs);

// Current coords (updated in gpsTask)
extern float currentLat;
extern float currentLng;

#endif
