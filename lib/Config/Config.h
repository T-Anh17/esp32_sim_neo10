#ifndef Config_H
#define Config_H
#include <Arduino.h>
#include <nvs.h>
#include <nvs_flash.h>

extern char PHONE[37];
extern char SMS[256];
extern double GPS_LAT;
extern double GPS_LNG;
extern String GPS_LINK;
extern bool GPS_READY;
extern bool ASSIST_READY;
extern nvs_handle_t nvsHandle;
#endif