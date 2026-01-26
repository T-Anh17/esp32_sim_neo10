#include <Arduino.h>
#include "strip/strip.h"
#include "WiFiManager/WiFiManager.h"
#include "DATAEG/SIM7680C.h"
#include "sms/sms.h"
#include "buzzer/buzzer.h"
#include "GPS/gps.h"
#include "button/button.h"
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>
#include "webserver/webserver.h"
#include "Storage/Storage.h"
#include "assistnow/assistnow.h"
#include "tracking/tracking.h"

TaskHandle_t xHandle_button = NULL;
TaskHandle_t xHandle_gps = NULL;
TaskHandle_t xHandle_sms = NULL;
TaskHandle_t xHandle_sim7680c = NULL;

void sosEnter();
void sosExit();
bool sosIsActive();
