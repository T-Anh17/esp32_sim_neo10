#pragma once
#include <Arduino.h>
#include "Storage/Storage.h"
#include "GPS/gps.h"
#include "DATAEG/SIM7680C.h"

void initFriendlyNamePortal(); // gọi trong setup()
void loopFriendlyNamePortal(); // gọi trong loop()
