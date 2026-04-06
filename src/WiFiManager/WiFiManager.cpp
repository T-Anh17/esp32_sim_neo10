#include "WiFiManager.h"
#include "server.h"
#include <time.h>

static constexpr const char *AP_SSID = "TV_DEVICE";
static constexpr const char *AP_PASS = "123456788";
static const IPAddress AP_IP(192, 168, 4, 1);
static const IPAddress AP_MASK(255, 255, 255, 0);

static bool hasStaCredentials() { return strlen(SSID_Name) > 0; }

static void configureSoftAp() {
  WiFi.softAPConfig(AP_IP, AP_IP, AP_MASK);
  if (WiFi.softAP(AP_SSID, AP_PASS, 6, 0))
    Serial.printf("[WIFI] AP OK  SSID=%s  IP=%s\n", AP_SSID,
                  WiFi.softAPIP().toString().c_str());
  else
    Serial.println("[WIFI] AP FAILED");
}

static void startStaConnect() {
  Serial.printf("[WIFI] STA connecting to '%s'...\n", SSID_Name);
  WiFi.begin(SSID_Name, SSID_Password);
}

// ============================================================
// WiFi event handler (informational only)
// ============================================================
static void onWiFiEvent(WiFiEvent_t event) {
  switch (event) {
  case ARDUINO_EVENT_WIFI_STA_GOT_IP:
    Serial.printf("[WIFI] STA connected, IP: %s\n",
                  WiFi.localIP().toString().c_str());
    configTime(0, 0, "pool.ntp.org", "time.google.com", "time.cloudflare.com");
    Serial.println("[WIFI] SNTP sync requested");
    break;
  case ARDUINO_EVENT_WIFI_AP_START:
    Serial.printf("[WIFI] AP started, SSID: %s  IP: %s\n",
                  WiFi.softAPSSID().c_str(),
                  WiFi.softAPIP().toString().c_str());
    break;
  case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
    Serial.println("[WIFI] STA disconnected");
    break;
  default:
    break;
  }
}

// ============================================================
// ** SINGLE SOURCE OF TRUTH for WiFi.mode() **
// Power-saving policy:
//   - If STA credentials exist, run STA-only to avoid constant AP drain.
//   - If no STA credentials exist, start AP for provisioning.
// ============================================================
void initWiFi() {
  WiFi.persistent(false);
  WiFi.setSleep(WIFI_PS_MIN_MODEM);
  WiFi.setAutoReconnect(true);
  WiFi.onEvent(onWiFiEvent);

  if (hasStaCredentials()) {
    WiFi.mode(WIFI_MODE_STA);
    startStaConnect();
  } else {
    WiFi.mode(WIFI_MODE_AP);
    configureSoftAp();
    Serial.println("[WIFI] No STA credentials, AP-only provisioning mode");
  }

  unsigned long t0 = millis();
  while (hasStaCredentials() && WiFi.status() != WL_CONNECTED &&
         millis() - t0 < 8000) {
    delay(400);
    Serial.print(".");
  }

  if (hasStaCredentials() && WiFi.status() == WL_CONNECTED)
    Serial.printf("\n[WIFI] STA OK  IP=%s\n",
                  WiFi.localIP().toString().c_str());
  else if (hasStaCredentials())
    Serial.println("\n[WIFI] STA failed");
  else
    Serial.println("\n[WIFI] STA failed (AP still running)");
}

void wifiEnterScanMode() {
  WiFi.setAutoReconnect(false);
  WiFi.disconnect(true, false);
  delay(100);
  WiFi.mode(WIFI_MODE_STA);
  delay(100);
  WiFi.disconnect(true, false);
  delay(100);
}

void wifiRestoreApStaMode() {
  if (hasStaCredentials()) {
    WiFi.mode(WIFI_MODE_STA);
  } else {
    WiFi.mode(WIFI_MODE_AP);
  }
  WiFi.setSleep(WIFI_PS_MIN_MODEM);
  if (hasStaCredentials())
    startStaConnect();
  else
    configureSoftAp();
  WiFi.setAutoReconnect(true);
}
