#include "tracking.h"
#include "Config.h"
#include "DATAEG/SIM7680C.h"
#include "GPS/gps.h"
#include "geofencing/geofencing.h"
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

#define SERVER_URL "https://gps-tracker.ahcntab.workers.dev/update"

static unsigned long lastSendMS = 0;

void Tracking_Init() { logLine("[TRACK] Init"); }

static bool isValidCoordPair(double lat, double lng) {
  if (lat < -90.0 || lat > 90.0)
    return false;
  if (lng < -180.0 || lng > 180.0)
    return false;
  if (lat == 0.0 && lng == 0.0)
    return false;
  return true;
}

static void appendJsonString(String &json, const String &value) {
  json += '"';
  for (size_t i = 0; i < value.length(); ++i) {
    const char ch = value[i];
    if (ch == '"' || ch == '\\')
      json += '\\';
    json += ch;
  }
  json += '"';
}

static void appendGeoFields(String &json, double currentLat, double currentLng,
                            const ConfigSnapshot &cfg) {
  bool homeSet = isValidCoordPair(cfg.homeLat, cfg.homeLng);
  bool currentValid = isValidCoordPair(currentLat, currentLng);
  double distanceToHomeM = -1.0;

  if (homeSet && currentValid) {
    distanceToHomeM =
        calculateDistance(currentLat, currentLng, cfg.homeLat, cfg.homeLng);
    if (distanceToHomeM < 0.0)
      distanceToHomeM = -1.0;
  }

  bool insideGeofence =
      homeSet && cfg.geofenceEnable && (distanceToHomeM >= 0.0) &&
      (distanceToHomeM <= static_cast<double>(cfg.geofenceRadiusM));

  json += ",\"homeSet\":";
  json += homeSet ? "true" : "false";

  if (homeSet) {
    json += ",\"homeLat\":";
    json += String(cfg.homeLat, 6);
    json += ",\"homeLng\":";
    json += String(cfg.homeLng, 6);
  }

  json += ",\"geoEnabled\":";
  json += cfg.geofenceEnable ? "true" : "false";
  json += ",\"geoRadiusM\":";
  json += String(cfg.geofenceRadiusM);
  json += ",\"distanceToHomeM\":";
  if (distanceToHomeM >= 0.0)
    json += String(distanceToHomeM, 1);
  else
    json += "-1";
  json += ",\"insideGeofence\":";
  json += insideGeofence ? "true" : "false";

  logPrintf("[TRACK] geo en=%d home=%d rad=%d dist=%.1f in=%d",
            cfg.geofenceEnable ? 1 : 0, homeSet ? 1 : 0, cfg.geofenceRadiusM,
            distanceToHomeM, insideGeofence ? 1 : 0);
}

static String buildTrackingPayload(double lat, double lng, bool isTest,
                                   const ConfigSnapshot &cfg,
                                   const BestLocationResult &loc) {
  int satellites = gps.satellites.isValid() ? gps.satellites.value() : 0;
  float speedKmph = gps.speed.isValid() ? gps.speed.kmph() : 0.0f;

  String json = "{\"id\":";
  appendJsonString(json, String(cfg.deviceId));
  json += ",\"deviceId\":";
  appendJsonString(json, String(cfg.deviceId));
  json += ",\"deviceName\":";
  appendJsonString(json, String(cfg.deviceName));
  json += ",\"lat\":";
  json += String(lat, 6);
  json += ",\"lng\":";
  json += String(lng, 6);

  json += ",\"locSource\":";
  appendJsonString(json, String(locationSourceName(loc.source)));
  json += ",\"locAccuracyM\":";
  json += String(loc.accuracyM, 1);
  json += ",\"locAgeMs\":";
  json += String(loc.ageMs);
  json += ",\"satellites\":";
  json += String(satellites);
  json += ",\"speedKmph\":";
  json += String(speedKmph, 1);

  appendGeoFields(json, lat, lng, cfg);

  if (isTest)
    json += ",\"test\":true";

  json += "}";
  return json;
}

// ============================================================
// Send via WiFi
// ============================================================
static bool sendViaWiFi(const String &json) {
  if (WiFi.status() != WL_CONNECTED)
    return false;

  HTTPClient http;
  WiFiClientSecure client;
  client.setInsecure();

  if (!http.begin(client, SERVER_URL)) {
    logLine("[TRACK] WiFi HTTP begin fail");
    telemetrySetTrackWifiCode(-1);
    return false;
  }
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000);

  int code = http.POST(json);
  telemetrySetTrackWifiCode(code);

  if (code >= 200 && code < 300) {
    logPrintf("[TRACK] WiFi OK (%d)", code);
  } else {
    logPrintf("[TRACK] WiFi fail: %d %s", code,
              http.errorToString(code).c_str());
  }
  http.end();
  return (code >= 200 && code < 300);
}

// ============================================================
// Send via SIM (4G)
// HTTP 715 = SIM7680C SSL handshake failure with Cloudflare
// Disable with SIM_TRACKING_ENABLE=false while debugging
// ============================================================
static void sendViaSIM(const String &json) {
  ConfigSnapshot cfg = {};
  getConfigSnapshot(&cfg);
  if (!SIM_hasCapability(SIM_CAP_DATA_OK) || !cfg.simTrackingEnable)
    return;
  if (telemetryIsSosActive())
    return;

  logLine("[TRACK] SIM POST...");
  if (!SIM7680C_httpPost(SERVER_URL, "application/json", json)) {
    TelemetrySnapshot telem = {};
    getTelemetrySnapshot(&telem);
    logPrintf("[TRACK] SIM fail: %d capability=%s", telem.trackSimCode,
              SIM_capabilityName(SIM_getCapability()));
  }
  // Note: SIM7680C_httpPost doesn't return a code cleanly,
  // but it logs the status internally
}

// ============================================================
void Tracking_Loop() {
  if (millis() - lastSendMS < 10000)
    return;
  lastSendMS = millis();
  if (telemetryIsSosActive())
    return;

  ConfigSnapshot cfg = {};
  getConfigSnapshot(&cfg);
  BestLocationResult loc = getBestAvailableLocation();
  if (!loc.valid)
    return;

  String json = buildTrackingPayload(loc.lat, loc.lng, false, cfg, loc);

  bool wifiOK = sendViaWiFi(json);
  if (!wifiOK)
    sendViaSIM(json);
}

// ============================================================
// One-shot test (for /track_test hidden endpoint)
// ============================================================
String trackingTestRequest() {
  if (WiFi.status() != WL_CONNECTED)
    return "{\"error\":\"WiFi not connected\"}";

  ConfigSnapshot cfg = {};
  getConfigSnapshot(&cfg);
  BestLocationResult loc = getBestAvailableLocation();
  if (!loc.valid)
    return "{\"error\":\"No location available\"}";

  String json = buildTrackingPayload(loc.lat, loc.lng, true, cfg, loc);

  HTTPClient http;
  WiFiClientSecure client;
  client.setInsecure();

  if (!http.begin(client, SERVER_URL))
    return "{\"error\":\"HTTP begin failed\"}";

  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);

  int code = http.POST(json);
  String payloadEcho = json;
  payloadEcho.replace("\"", "'");
  String result =
      "{\"http_code\":" + String(code) + ",\"payload\":\"" + payloadEcho + "\"";
  if (code > 0) {
    String body = http.getString();
    body.replace("\"", "'");
    result += ",\"body\":\"" + body + "\"";
  } else {
    result += ",\"error\":\"" + http.errorToString(code) + "\"";
  }
  result += "}";
  http.end();
  return result;
}
