#include "Config.h"
#include <nvs.h>
char PHONE[37];
char SMS[256];
char GPS[100];
double GPS_LAT = 0.0;
double GPS_LNG = 0.0;
bool GPS_READY = false;
bool ASSIST_READY = false;
String GPS_LINK = "";
nvs_handle_t nvsHandle;