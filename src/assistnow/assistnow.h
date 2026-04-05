#pragma once
#include <Arduino.h>
#include <HardwareSerial.h>

// ============================================================
// AssistNow A-GPS — Download, cache, and inject u-blox data
//
// Credential types (two DIFFERENT things):
//
//   ASSIST_TOKEN (from u-blox Thingstream account):
//     -> https://online-live1.services.u-blox.com/GetOnlineData.ashx
//         ?token=<TOKEN>&gnss=gps,gal&datatype=eph,alm,aux
//     -> fallback: online-live2.services.u-blox.com
//
//   ASSIST_CHIPCODE (device-specific, Base64-encoded):
//     -> https://assistnow.services.u-blox.com/GetAssistNowData.ashx
//         ?chipcode=<CHIPCODE>&gnss=gps,gal&data=uporb_1,ualm
//     (Different endpoint! Different parameter name!)
//
// Priority: TOKEN > CHIPCODE > offline cache only.
// Max 1 attempt per URL (no spinning retries).
//
// Files on LittleFS:
//   /assistnow.ubx     — cached UBX assistance data
//   /assistnow_ts.txt  — timestamp of last download
//
// Offline manual cache:
//   Place assistnow.ubx into the project's data/ folder and run:
//     pio run -t uploadfs
//   The firmware will inject it at boot even without WiFi/credentials.
//
// ASSIST_STATUS values:
//   not_run, cache_fresh, download_ok, download_fail, download_sim_ok,
//   download_sim_fail, no_credentials, no_cache, cached_injected,
//   cache_invalid
//
// Log tag: [ASSIST]
// ============================================================

// Download AssistNow via WiFi (HTTPS)
bool downloadAssistNow();

// Download AssistNow via SIM modem (HTTP GET through AT commands)
// Uses same URLs but downloads through cellular data
bool downloadAssistNowViaSIM();

// Inject cached UBX data into GPS module
bool injectAssistNow(HardwareSerial &gpsSerial);
