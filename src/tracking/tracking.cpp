#include "tracking.h"
#include "Config.h"
#include "DATAEG/SIM7680C.h"
#include "GPS/gps.h"
#include "geofencing/geofencing.h"
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

static constexpr const char *DEFAULT_TRACKING_URL =
    "https://gps-tracker.ahcntab.workers.dev/update";
static constexpr const char *DEFAULT_TRACKING_GET_URL =
    "https://gps-tracker.ahcntab.workers.dev/update_get";

// Low-power default profile for 2000mAh LiPo deployments.
static constexpr unsigned long CURRENT_MOVING_INTERVAL_MS = 900000UL;
static constexpr unsigned long CURRENT_STATIONARY_INTERVAL_MS = 7200000UL;
static constexpr unsigned long CURRENT_DISTANCE_MIN_GAP_MS = 900000UL;
static constexpr double CURRENT_DISTANCE_DELTA_M = 500.0;

static constexpr unsigned long HISTORY_MOVING_INTERVAL_MS = 7200000UL;
static constexpr unsigned long HISTORY_STATIONARY_INTERVAL_MS = 21600000UL;
static constexpr unsigned long HISTORY_DISTANCE_MIN_GAP_MS = 3600000UL;
static constexpr double HISTORY_DISTANCE_DELTA_M = 1500.0;
static constexpr unsigned long TRACK_SEND_RETRY_BACKOFF_MS = 60000UL;

static unsigned long lastCurrentSendMS = 0;
static unsigned long lastHistorySendMS = 0;
static unsigned long lastFailedSendMs = 0;
static double lastCurrentLat = 0.0;
static double lastCurrentLng = 0.0;
static double lastHistoryLat = 0.0;
static double lastHistoryLng = 0.0;
static LocationSource lastCurrentSource = LOC_NONE;
static LocationSource lastHistorySource = LOC_NONE;
static bool hasCurrentSnapshot = false;
static bool hasHistorySnapshot = false;

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

static double distanceBetweenMeters(double latA, double lngA, double latB,
                                    double lngB) {
  if (!isValidCoordPair(latA, lngA) || !isValidCoordPair(latB, lngB))
    return -1.0;
  return calculateDistance(latA, lngA, latB, lngB);
}

static float readCurrentSpeedKmph() {
  return gps.speed.isValid() ? gps.speed.kmph() : 0.0f;
}

static bool isMovingNow(const BestLocationResult &loc, float speedKmph) {
  return loc.source == LOC_GPS && speedKmph >= 5.0f;
}

static bool shouldSendCurrentSnapshot(const BestLocationResult &loc,
                                      float speedKmph, unsigned long nowMs) {
  if (!hasCurrentSnapshot)
    return true;

  if (loc.source != lastCurrentSource)
    return true;

  const double movedM =
      distanceBetweenMeters(loc.lat, loc.lng, lastCurrentLat, lastCurrentLng);
  if (movedM >= CURRENT_DISTANCE_DELTA_M &&
      (nowMs - lastCurrentSendMS) >= CURRENT_DISTANCE_MIN_GAP_MS) {
    return true;
  }

  const unsigned long intervalMs =
      isMovingNow(loc, speedKmph) ? CURRENT_MOVING_INTERVAL_MS
                                  : CURRENT_STATIONARY_INTERVAL_MS;
  return (nowMs - lastCurrentSendMS) >= intervalMs;
}

static bool shouldWriteHistorySample(const BestLocationResult &loc,
                                     float speedKmph, unsigned long nowMs) {
  if (!hasHistorySnapshot)
    return true;

  if (loc.source != lastHistorySource &&
      (nowMs - lastHistorySendMS) >= HISTORY_DISTANCE_MIN_GAP_MS) {
    return true;
  }

  const double movedM =
      distanceBetweenMeters(loc.lat, loc.lng, lastHistoryLat, lastHistoryLng);
  if (movedM >= HISTORY_DISTANCE_DELTA_M &&
      (nowMs - lastHistorySendMS) >= HISTORY_DISTANCE_MIN_GAP_MS) {
    return true;
  }

  const unsigned long intervalMs =
      isMovingNow(loc, speedKmph) ? HISTORY_MOVING_INTERVAL_MS
                                  : HISTORY_STATIONARY_INTERVAL_MS;
  return (nowMs - lastHistorySendMS) >= intervalMs;
}

static void rememberCurrentSnapshot(const BestLocationResult &loc,
                                    unsigned long nowMs) {
  lastCurrentSendMS = nowMs;
  lastCurrentLat = loc.lat;
  lastCurrentLng = loc.lng;
  lastCurrentSource = loc.source;
  hasCurrentSnapshot = true;
}

static void rememberHistorySnapshot(const BestLocationResult &loc,
                                    unsigned long nowMs) {
  lastHistorySendMS = nowMs;
  lastHistoryLat = loc.lat;
  lastHistoryLng = loc.lng;
  lastHistorySource = loc.source;
  hasHistorySnapshot = true;
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

static String urlEncodeTrack(const String &input) {
  String out;
  const char *hex = "0123456789ABCDEF";
  for (size_t i = 0; i < input.length(); ++i) {
    unsigned char c = static_cast<unsigned char>(input[i]);
    const bool safe =
        (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
        (c >= '0' && c <= '9') || c == '-' || c == '_' || c == '.' ||
        c == '~';
    if (safe) {
      out += static_cast<char>(c);
    } else {
      out += '%';
      out += hex[(c >> 4) & 0x0F];
      out += hex[c & 0x0F];
    }
  }
  return out;
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
                                   const BestLocationResult &loc,
                                   bool historySample) {
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
  json += ",\"historySample\":";
  json += historySample ? "true" : "false";

  appendGeoFields(json, lat, lng, cfg);

  if (isTest)
    json += ",\"test\":true";

  json += "}";
  return json;
}

static String buildTrackingFallbackGetUrl(const ConfigSnapshot &cfg,
                                          const BestLocationResult &loc,
                                          bool historySample) {
  if (strlen(cfg.simTrackingUrl) < 8)
    return "";

  int satellites = gps.satellites.isValid() ? gps.satellites.value() : 0;
  float speedKmph = gps.speed.isValid() ? gps.speed.kmph() : 0.0f;

  String url = String(cfg.simTrackingUrl);
  int queryCut = url.indexOf('?');
  if (queryCut >= 0)
    url = url.substring(0, queryCut);
  int updateIdx = url.indexOf("/update");
  if (updateIdx >= 0)
    url = url.substring(0, updateIdx) + "/update_get";
  else
    url = DEFAULT_TRACKING_GET_URL;
  url += "?deviceId=";
  url += urlEncodeTrack(String(cfg.deviceId));
  url += "&deviceName=";
  url += urlEncodeTrack(String(cfg.deviceName));
  url += "&lat=";
  url += String(loc.lat, 6);
  url += "&lng=";
  url += String(loc.lng, 6);
  url += "&locSource=";
  url += urlEncodeTrack(String(locationSourceName(loc.source)));
  url += "&locAccuracyM=";
  url += String(loc.accuracyM, 1);
  url += "&locAgeMs=";
  url += String(loc.ageMs);
  url += "&satellites=";
  url += String(satellites);
  url += "&speedKmph=";
  url += String(speedKmph, 1);
  url += "&historySample=";
  url += historySample ? "1" : "0";
  return url;
}

// ============================================================
// Send via WiFi
// ============================================================
static bool sendViaWiFi(const String &json) {
  if (WiFi.status() != WL_CONNECTED)
    return false;

  ConfigSnapshot cfg = {};
  getConfigSnapshot(&cfg);
  const char *wifiUrl =
      strlen(cfg.wifiTrackingUrl) >= 8 ? cfg.wifiTrackingUrl : DEFAULT_TRACKING_URL;

  HTTPClient http;
  WiFiClientSecure client;
  client.setInsecure();

  if (!http.begin(client, wifiUrl)) {
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
static bool sendViaSIM(const String &json) {
  ConfigSnapshot cfg = {};
  getConfigSnapshot(&cfg);
  if (!SIM_hasCapability(SIM_CAP_DATA_OK) || !cfg.simTrackingEnable)
    return false;
  if (telemetryIsSosActive())
    return false;
  if (strlen(cfg.simTrackingUrl) < 8) {
    logLine("[TRACK] SIM tracking URL not configured, skip");
    return false;
  }
  const char *simUrl = cfg.simTrackingUrl;
  if (SIM7680C_isTlsHostBlocked(simUrl)) {
    logPrintf("[TRACK] SIM TLS blocked for host=%s", simUrl);
    telemetrySetTrackSimCode(715);
    return false;
  }

  logLine("[TRACK] SIM POST...");
  if (!SIM7680C_httpPost(simUrl, "application/json", json)) {
    TelemetrySnapshot telem = {};
    getTelemetrySnapshot(&telem);
    logPrintf("[TRACK] SIM fail: %d capability=%s", telem.trackSimCode,
              SIM_capabilityName(SIM_getCapability()));
    return false;
  }
  // Note: SIM7680C_httpPost doesn't return a code cleanly,
  // but it logs the status internally
  return true;
}

// ============================================================
void Tracking_Loop() {
  if (telemetryIsSosActive())
    return;

  ConfigSnapshot cfg = {};
  getConfigSnapshot(&cfg);
  BestLocationResult loc = getBestAvailableLocation();
  if (!loc.valid)
    return;

  // Don't auto-track HOME fallback. It is only a rough placeholder and causes
  // noisy retries before the device has obtained any live location.
  if (loc.source == LOC_HOME)
    return;

  const unsigned long nowMs = millis();
  if (lastFailedSendMs > 0 &&
      (nowMs - lastFailedSendMs) < TRACK_SEND_RETRY_BACKOFF_MS) {
    return;
  }

  const float speedKmph = readCurrentSpeedKmph();
  const bool sendCurrent = shouldSendCurrentSnapshot(loc, speedKmph, nowMs);
  const bool writeHistory = shouldWriteHistorySample(loc, speedKmph, nowMs);

  if (!sendCurrent && !writeHistory)
    return;

  String json =
      buildTrackingPayload(loc.lat, loc.lng, false, cfg, loc, writeHistory);

  bool wifiOK = sendViaWiFi(json);
  if (!wifiOK) {
    wifiOK = sendViaSIM(json);
    if (!wifiOK) {
      String fallbackUrl =
          buildTrackingFallbackGetUrl(cfg, loc, writeHistory);
      if (fallbackUrl.length() > 0) {
        logPrintf("[TRACK] SIM GET fallback urlLen=%d", fallbackUrl.length());
        String response;
        if (SIM7680C_httpGetWithResponse(fallbackUrl, response)) {
          logPrintf("[TRACK] SIM GET fallback OK body=%s", response.c_str());
          wifiOK = true;
        } else if (response.length() > 0) {
          logPrintf("[TRACK] SIM GET fallback body=%s", response.c_str());
        } else {
          logLine("[TRACK] SIM GET fallback failed");
        }
      } else {
        logLine("[TRACK] SIM GET fallback disabled: no SIM URL");
      }
    }
  }

  if (wifiOK) {
    lastFailedSendMs = 0;
    rememberCurrentSnapshot(loc, nowMs);
    if (writeHistory)
      rememberHistorySnapshot(loc, nowMs);
  } else {
    lastFailedSendMs = nowMs;
  }
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

  String json = buildTrackingPayload(loc.lat, loc.lng, true, cfg, loc, true);

  HTTPClient http;
  WiFiClientSecure client;
  client.setInsecure();

  const char *wifiUrl =
      strlen(cfg.wifiTrackingUrl) >= 8 ? cfg.wifiTrackingUrl : DEFAULT_TRACKING_URL;

  if (!http.begin(client, wifiUrl))
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
