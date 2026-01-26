#pragma once
#include <Arduino.h>
#include "../GPS/gps.h"
#include "../DATAEG/SIM7680C.h"

void Tracking_Init();
void Tracking_Loop();
void Tracking_StartTask();
void Tracking_SetEnabled(bool enabled);
