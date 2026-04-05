#include "Config.h"

nvs_handle_t nvsHandle;
SemaphoreHandle_t serialMutex = NULL;
static SemaphoreHandle_t configMutex = NULL;
static SemaphoreHandle_t telemetryMutex = NULL;
static char ASSIST_STATUS_BUF[TELEMETRY_STATUS_LEN] = "not_run";

double GPS_LAT = 0.0;
double GPS_LNG = 0.0;
String GPS_LINK = "";
bool GPS_READY = false;
bool ASSIST_READY = false;

char CALL_1[37] = "";
char CALL_2[37] = "";
char CALL_3[37] = "";
char HOTLINE_NUMBER[37] = "0982690587";
int RING_SECONDS = 30;
char SMS_TEMPLATE[256] = "I need support. Please visit at: ";

bool GEOFENCE_ENABLE = false;
double HOME_LAT = 0.0;
double HOME_LNG = 0.0;
int GEOFENCE_RADIUS_M = 200;

bool SIGNAL_WARN_ENABLE = false;
int SIGNAL_WARN_COOLDOWN_MIN = 15;
int SIGNAL_WARN_CALL_MODE = 0; // 0=SMS, 1=SMS+hotline, 2=SMS+cascade

char ASSIST_CHIPCODE[64] = ""; // no compiled-in default; loaded from NVS only
char ASSIST_TOKEN[128] = "";

bool SIM_TRACKING_ENABLE = true;

volatile uint8_t SIM_CAPABILITY_LEVEL = 0;
volatile bool SOS_ACTIVE = false;
volatile bool SOS_CANCEL_REQUESTED = false;
volatile int SIGNAL_4G = 0;
volatile int SIGNAL_WIFI = 0;
volatile int SIGNAL_CSQ_RAW = 99;
volatile int SIGNAL_RSSI_RAW = 0;

volatile unsigned long FIRST_FIX_MS = 0;
volatile unsigned long BOOT_MS = 0;
const char *ASSIST_STATUS = ASSIST_STATUS_BUF;
volatile int TRACK_WIFI_CODE = 0;
volatile int TRACK_SIM_CODE = 0;

char PHONE[37] = "";
char SMS[256] = "";

static inline void lockConfig() {
  if (configMutex)
    xSemaphoreTake(configMutex, portMAX_DELAY);
}

static inline void unlockConfig() {
  if (configMutex)
    xSemaphoreGive(configMutex);
}

static inline void lockTelemetry() {
  if (telemetryMutex)
    xSemaphoreTake(telemetryMutex, portMAX_DELAY);
}

static inline void unlockTelemetry() {
  if (telemetryMutex)
    xSemaphoreGive(telemetryMutex);
}

static void syncLegacyUnlocked() {
  strncpy(PHONE, CALL_1, sizeof(PHONE) - 1);
  PHONE[sizeof(PHONE) - 1] = '\0';
  strncpy(SMS, SMS_TEMPLATE, sizeof(SMS) - 1);
  SMS[sizeof(SMS) - 1] = '\0';
}

void initSharedState() {
  if (!configMutex)
    configMutex = xSemaphoreCreateMutex();
  if (!telemetryMutex)
    telemetryMutex = xSemaphoreCreateMutex();
}

void getConfigSnapshot(ConfigSnapshot *out) {
  if (!out)
    return;

  lockConfig();
  strncpy(out->call1, CALL_1, sizeof(out->call1) - 1);
  out->call1[sizeof(out->call1) - 1] = '\0';
  strncpy(out->call2, CALL_2, sizeof(out->call2) - 1);
  out->call2[sizeof(out->call2) - 1] = '\0';
  strncpy(out->call3, CALL_3, sizeof(out->call3) - 1);
  out->call3[sizeof(out->call3) - 1] = '\0';
  strncpy(out->hotline, HOTLINE_NUMBER, sizeof(out->hotline) - 1);
  out->hotline[sizeof(out->hotline) - 1] = '\0';
  out->ringSeconds = RING_SECONDS;
  strncpy(out->smsTemplate, SMS_TEMPLATE, sizeof(out->smsTemplate) - 1);
  out->smsTemplate[sizeof(out->smsTemplate) - 1] = '\0';
  out->geofenceEnable = GEOFENCE_ENABLE;
  out->homeLat = HOME_LAT;
  out->homeLng = HOME_LNG;
  out->geofenceRadiusM = GEOFENCE_RADIUS_M;
  out->signalWarnEnable = SIGNAL_WARN_ENABLE;
  out->signalWarnCooldownMin = SIGNAL_WARN_COOLDOWN_MIN;
  out->signalWarnCallMode = SIGNAL_WARN_CALL_MODE;
  strncpy(out->assistChipcode, ASSIST_CHIPCODE, sizeof(out->assistChipcode) - 1);
  out->assistChipcode[sizeof(out->assistChipcode) - 1] = '\0';
  strncpy(out->assistToken, ASSIST_TOKEN, sizeof(out->assistToken) - 1);
  out->assistToken[sizeof(out->assistToken) - 1] = '\0';
  out->simTrackingEnable = SIM_TRACKING_ENABLE;
  unlockConfig();
}

void applyConfigSnapshot(const ConfigSnapshot *snapshot) {
  if (!snapshot)
    return;

  lockConfig();
  strncpy(CALL_1, snapshot->call1, sizeof(CALL_1) - 1);
  CALL_1[sizeof(CALL_1) - 1] = '\0';
  strncpy(CALL_2, snapshot->call2, sizeof(CALL_2) - 1);
  CALL_2[sizeof(CALL_2) - 1] = '\0';
  strncpy(CALL_3, snapshot->call3, sizeof(CALL_3) - 1);
  CALL_3[sizeof(CALL_3) - 1] = '\0';
  strncpy(HOTLINE_NUMBER, snapshot->hotline, sizeof(HOTLINE_NUMBER) - 1);
  HOTLINE_NUMBER[sizeof(HOTLINE_NUMBER) - 1] = '\0';
  RING_SECONDS = snapshot->ringSeconds;
  strncpy(SMS_TEMPLATE, snapshot->smsTemplate, sizeof(SMS_TEMPLATE) - 1);
  SMS_TEMPLATE[sizeof(SMS_TEMPLATE) - 1] = '\0';
  GEOFENCE_ENABLE = snapshot->geofenceEnable;
  HOME_LAT = snapshot->homeLat;
  HOME_LNG = snapshot->homeLng;
  GEOFENCE_RADIUS_M = snapshot->geofenceRadiusM;
  SIGNAL_WARN_ENABLE = snapshot->signalWarnEnable;
  SIGNAL_WARN_COOLDOWN_MIN = snapshot->signalWarnCooldownMin;
  SIGNAL_WARN_CALL_MODE = snapshot->signalWarnCallMode;
  strncpy(ASSIST_CHIPCODE, snapshot->assistChipcode, sizeof(ASSIST_CHIPCODE) - 1);
  ASSIST_CHIPCODE[sizeof(ASSIST_CHIPCODE) - 1] = '\0';
  strncpy(ASSIST_TOKEN, snapshot->assistToken, sizeof(ASSIST_TOKEN) - 1);
  ASSIST_TOKEN[sizeof(ASSIST_TOKEN) - 1] = '\0';
  SIM_TRACKING_ENABLE = snapshot->simTrackingEnable;
  syncLegacyUnlocked();
  unlockConfig();
}

void updateHomeConfig(double lat, double lng) {
  lockConfig();
  HOME_LAT = lat;
  HOME_LNG = lng;
  unlockConfig();
}

void getTelemetrySnapshot(TelemetrySnapshot *out) {
  if (!out)
    return;

  lockTelemetry();
  out->gpsReady = GPS_READY;
  out->assistReady = ASSIST_READY;
  out->simCapabilityLevel = SIM_CAPABILITY_LEVEL;
  out->sosActive = SOS_ACTIVE;
  out->sosCancelRequested = SOS_CANCEL_REQUESTED;
  out->signal4G = SIGNAL_4G;
  out->signalWiFi = SIGNAL_WIFI;
  out->signalCsqRaw = SIGNAL_CSQ_RAW;
  out->signalRssiRaw = SIGNAL_RSSI_RAW;
  out->firstFixMs = FIRST_FIX_MS;
  out->bootMs = BOOT_MS;
  out->trackWifiCode = TRACK_WIFI_CODE;
  out->trackSimCode = TRACK_SIM_CODE;
  strncpy(out->assistStatus, ASSIST_STATUS ? ASSIST_STATUS : "",
          sizeof(out->assistStatus) - 1);
  out->assistStatus[sizeof(out->assistStatus) - 1] = '\0';
  unlockTelemetry();
}

void telemetrySetGpsReady(bool ready, unsigned long firstFixMs) {
  lockTelemetry();
  GPS_READY = ready;
  FIRST_FIX_MS = firstFixMs;
  unlockTelemetry();
}

void telemetrySetAssistReady(bool ready) {
  lockTelemetry();
  ASSIST_READY = ready;
  unlockTelemetry();
}

void telemetrySetSimCapability(uint8_t level) {
  lockTelemetry();
  SIM_CAPABILITY_LEVEL = level;
  unlockTelemetry();
}

void telemetrySetSosState(bool active) {
  lockTelemetry();
  SOS_ACTIVE = active;
  unlockTelemetry();
}

void telemetrySetSosCancelRequested(bool requested) {
  lockTelemetry();
  SOS_CANCEL_REQUESTED = requested;
  unlockTelemetry();
}

bool telemetryIsSosActive() {
  lockTelemetry();
  bool active = SOS_ACTIVE;
  unlockTelemetry();
  return active;
}

bool telemetryIsSosCancellationRequested() {
  lockTelemetry();
  bool requested = SOS_CANCEL_REQUESTED;
  unlockTelemetry();
  return requested;
}

void telemetrySetSignalLevels(int signal4G, int signalWiFi, int signalCsqRaw,
                              int signalRssiRaw) {
  lockTelemetry();
  SIGNAL_4G = signal4G;
  SIGNAL_WIFI = signalWiFi;
  SIGNAL_CSQ_RAW = signalCsqRaw;
  SIGNAL_RSSI_RAW = signalRssiRaw;
  unlockTelemetry();
}

void telemetrySetBootMs(unsigned long bootMs) {
  lockTelemetry();
  BOOT_MS = bootMs;
  unlockTelemetry();
}

void telemetrySetTrackCodes(int wifiCode, int simCode) {
  lockTelemetry();
  TRACK_WIFI_CODE = wifiCode;
  TRACK_SIM_CODE = simCode;
  unlockTelemetry();
}

void telemetrySetTrackWifiCode(int wifiCode) {
  lockTelemetry();
  TRACK_WIFI_CODE = wifiCode;
  unlockTelemetry();
}

void telemetrySetTrackSimCode(int simCode) {
  lockTelemetry();
  TRACK_SIM_CODE = simCode;
  unlockTelemetry();
}

void telemetrySetAssistStatus(const char *status) {
  lockTelemetry();
  strncpy(ASSIST_STATUS_BUF, status ? status : "", sizeof(ASSIST_STATUS_BUF) - 1);
  ASSIST_STATUS_BUF[sizeof(ASSIST_STATUS_BUF) - 1] = '\0';
  ASSIST_STATUS = ASSIST_STATUS_BUF;
  unlockTelemetry();
}

void logLine(const char *line) {
  if (serialMutex)
    xSemaphoreTake(serialMutex, pdMS_TO_TICKS(100));
  Serial.println(line);
  if (serialMutex)
    xSemaphoreGive(serialMutex);
}

void logPrintf(const char *fmt, ...) {
  char buf[256];
  va_list args;
  va_start(args, fmt);
  vsnprintf(buf, sizeof(buf), fmt, args);
  va_end(args);
  logLine(buf);
}
