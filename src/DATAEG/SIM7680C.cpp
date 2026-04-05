#include "SIM7680C.h"

HardwareSerial simSerial(2);
SemaphoreHandle_t simMutex = NULL;

static bool sim_cancelRequested() {
  TelemetrySnapshot snapshot = {};
  getTelemetrySnapshot(&snapshot);
  return snapshot.sosActive && snapshot.sosCancelRequested;
}

SimCapability SIM_getCapability() {
  TelemetrySnapshot snapshot = {};
  getTelemetrySnapshot(&snapshot);
  return static_cast<SimCapability>(snapshot.simCapabilityLevel);
}

void SIM_setCapability(SimCapability capability) {
  telemetrySetSimCapability(static_cast<uint8_t>(capability));
}

bool SIM_hasCapability(SimCapability minimumCapability) {
  return SIM_getCapability() >= minimumCapability;
}

const char *SIM_capabilityName(SimCapability capability) {
  switch (capability) {
  case SIM_CAP_BOOTING:
    return "boot";
  case SIM_CAP_RADIO_OK:
    return "radio";
  case SIM_CAP_VOICE_SMS_OK:
    return "voice";
  case SIM_CAP_DATA_OK:
    return "data";
  case SIM_CAP_HTTP_OK:
    return "http";
  default:
    return "off";
  }
}

static bool sim_detectDataSession() {
  if (simMutex)
    xSemaphoreTake(simMutex, portMAX_DELAY);

  simSerial.println("AT+CGATT?");
  String attachResp = sim_readResponse(500);
  bool attached = (attachResp.indexOf("+CGATT: 1") >= 0);
  bool hasIp = false;

  if (attached) {
    simSerial.println("AT+CGPADDR=1");
    String ipResp = sim_readResponse(700);
    int prefix = ipResp.indexOf("+CGPADDR: 1,");
    if (prefix >= 0) {
      for (int i = prefix + 12; i < ipResp.length(); i++) {
        if (ipResp[i] >= '0' && ipResp[i] <= '9') {
          hasIp = true;
          break;
        }
      }
    }
  }

  if (simMutex)
    xSemaphoreGive(simMutex);

  bool dataReady = attached && hasIp;
  if (dataReady) {
    SIM_setCapability(SIM_CAP_DATA_OK);
  } else if (SIM_getCapability() > SIM_CAP_VOICE_SMS_OK) {
    SIM_setCapability(SIM_CAP_VOICE_SMS_OK);
  }
  return dataReady;
}

// ============================================================
// Helper: read modem response with timeout
// ============================================================
String sim_readResponse(uint32_t timeoutMs) {
  String r = "";
  unsigned long t0 = millis();
  while (millis() - t0 < timeoutMs) {
    while (simSerial.available()) {
      r += (char)simSerial.read();
    }
    vTaskDelay(1);
  }
  return r;
}

// ============================================================
// Init modem
// ============================================================
void init_sim7680c() {
  logLine("[SIM7680C] Init...");
  SIM_setCapability(SIM_CAP_BOOTING);
  telemetrySetTrackSimCode(0);

  simMutex = xSemaphoreCreateMutex();
  if (!simMutex) {
    logLine("[SIM7680C] Mutex creation FAILED!");
  }

  simSerial.begin(MCU_SIM_BAUDRATE, SERIAL_8N1, SIM_RX_PIN, SIM_TX_PIN);

  // Handshake
  bool ready = false;
  for (int i = 0; i < 10; i++) {
    simSerial.println("AT");
    delay(100);
    if (simSerial.find("OK")) {
      ready = true;
      break;
    }
  }
  if (!ready) {
    logLine("[SIM7680C] No response!");
    SIM_setCapability(SIM_CAP_NONE);
    return;
  }
  SIM_setCapability(SIM_CAP_RADIO_OK);

  // PDP context (Viettel)
  simSerial.println("AT+CGATT=1");
  delay(100);
  simSerial.println("AT+CGDCONT=1,\"IP\",\"v-internet\"");
  delay(100);
  simSerial.println("AT+CGACT=1,1");
  delay(100);

  // SSL relaxed config (demo stability)
  simSerial.println("AT+CSSLCFG=\"sslversion\",0,3");
  delay(100);
  simSerial.println("AT+CSSLCFG=\"authmode\",0,0");
  delay(100);
  simSerial.println("AT+CSSLCFG=\"ignoretimediff\",0,1");
  delay(100);

  // SMS text mode + CLCC unsolicited
  const char *cmds[] = {
      "AT+CPIN?",  "AT+CSQ", "AT+CREG?", "AT+COPS?", "AT+CPSI?",
      "AT+CMGF=1", // SMS text mode
      "AT+CLCC=1", // enable +CLCC URC for call state
  };
  for (auto &cmd : cmds) {
    simSerial.println(cmd);
    delay(150);
    // Drain response
    unsigned long t = millis();
    while (millis() - t < 300)
      if (simSerial.available())
        simSerial.read();
  }

  if (sim_isRegistered()) {
    SIM_setCapability(SIM_CAP_VOICE_SMS_OK);
    sim_detectDataSession();
  }

  logPrintf("[SIM7680C] Init done, capability=%s",
            SIM_capabilityName(SIM_getCapability()));
}

void task_init_sim7680c(void *pvParameters) {
  init_sim7680c();
  vTaskDelete(NULL);
}

// ============================================================
// Network registration check
// ============================================================
bool sim_isRegistered() {
  if (simMutex)
    xSemaphoreTake(simMutex, portMAX_DELAY);

  simSerial.println("AT+CREG?");
  String r = sim_readResponse(500);

  if (simMutex)
    xSemaphoreGive(simMutex);

  bool registered = (r.indexOf(",1") > 0 || r.indexOf(",5") > 0);
  if (registered) {
    if (SIM_getCapability() < SIM_CAP_VOICE_SMS_OK)
      SIM_setCapability(SIM_CAP_VOICE_SMS_OK);
  } else if (SIM_getCapability() > SIM_CAP_RADIO_OK) {
    SIM_setCapability(SIM_CAP_RADIO_OK);
  }
  return registered;
}

// ============================================================
// CSQ reading  (0-31 valid, 99=unknown)
// Mapping to 0..10:
//   CSQ   dBm         Level
//   0     -113        0
//   1     -111        0
//   2-9   -109..-97   1-3
//   10-14 -93..-85    4-5
//   15-19 -83..-75    6-7
//   20-24 -71..-63    8-9
//   25-31 -61..-51    10
//   99    unknown     0
// ============================================================
int sim_readCSQ() {
  if (simMutex)
    xSemaphoreTake(simMutex, portMAX_DELAY);

  simSerial.println("AT+CSQ");
  String r = sim_readResponse(500);

  if (simMutex)
    xSemaphoreGive(simMutex);

  // Parse "+CSQ: xx,yy"
  int idx = r.indexOf("+CSQ: ");
  if (idx < 0)
    return 99;
  int comma = r.indexOf(",", idx);
  if (comma < 0)
    return 99;
  int csq = r.substring(idx + 6, comma).toInt();
  return csq;
}

int sim_getSignalLevel() {
  int csq = sim_readCSQ();
  if (csq == 99 || csq == 0)
    return 0;
  if (csq <= 1)
    return 0;
  if (csq <= 9)
    return (csq - 2) * 3 / 8 + 1; // ~1-3
  if (csq <= 14)
    return (csq - 10) + 4; // 4-8 mapped to 4-5
  if (csq <= 19)
    return 6 + (csq - 15) / 3; // 6-7
  if (csq <= 24)
    return 8 + (csq - 20) / 3; // 8-9
  return 10;
}

// ============================================================
// Send SMS to a specific number
// ============================================================
void SIM7680C_sendSMS_to(const char *number, const String &message) {
  if (!number || strlen(number) < 3)
    return;
  if (!SIM_hasCapability(SIM_CAP_VOICE_SMS_OK) && !sim_isRegistered()) {
    logPrintf("[SIM7680C] SMS skipped, capability=%s",
              SIM_capabilityName(SIM_getCapability()));
    return;
  }
  if (simMutex)
    xSemaphoreTake(simMutex, portMAX_DELAY);

  if (sim_cancelRequested()) {
    if (simMutex)
      xSemaphoreGive(simMutex);
    logLine("[SIM7680C] SMS cancelled before send");
    return;
  }

  logPrintf("[SIM7680C] SMS -> %s", number);

  simSerial.printf("AT+CMGS=\"%s\"\r\n", number);
  delay(300);
  if (sim_cancelRequested()) {
    simSerial.write(27); // ESC cancels text-mode SMS input
    delay(100);
    while (simSerial.available())
      simSerial.read();
    if (simMutex)
      xSemaphoreGive(simMutex);
    logLine("[SIM7680C] SMS cancelled before payload");
    return;
  }
  simSerial.print(message);
  delay(100);
  simSerial.write(26); // Ctrl+Z

  unsigned long t0 = millis();
  while (millis() - t0 < 5000) {
    if (sim_cancelRequested()) {
      logLine("[SIM7680C] SMS cancel requested while waiting modem");
      break;
    }
    if (simSerial.available())
      Serial.write(simSerial.read());
    vTaskDelay(1);
  }
  logLine("[SIM7680C] SMS done");

  if (simMutex)
    xSemaphoreGive(simMutex);
}

void SIM7680C_sendSMS(const String &mapLink) {
  ConfigSnapshot cfg = {};
  getConfigSnapshot(&cfg);

  String msg = String(cfg.smsTemplate) + " - Link: " + mapLink;
  msg += "\nWeb: https://thanhvu220809.github.io/gps-dashboard/";
  SIM7680C_sendSMS_to(cfg.call1, msg);
}

// ============================================================
// Call a number. Returns true if answered (detected via CLCC/VOICE CALL).
// ============================================================
bool SIM7680C_callNumber(const char *number, int ringSeconds) {
  if (!number || strlen(number) < 3)
    return false;
  if (!SIM_hasCapability(SIM_CAP_VOICE_SMS_OK) && !sim_isRegistered()) {
    logPrintf("[CALL] SIM capability=%s, skip %s",
              SIM_capabilityName(SIM_getCapability()), number);
    return false;
  }
  if (simMutex)
    xSemaphoreTake(simMutex, portMAX_DELAY);

  if (sim_cancelRequested()) {
    if (simMutex)
      xSemaphoreGive(simMutex);
    logLine("[CALL] Cancelled before dial");
    return false;
  }

  logPrintf("[CALL] Dialing %s for %ds...", number, ringSeconds);
  simSerial.printf("ATD%s;\r\n", number);

  unsigned long t0 = millis();
  unsigned long timeoutMs = (unsigned long)ringSeconds * 1000UL;
  String res = "";
  bool answered = false;

  while (millis() - t0 < timeoutMs) {
    if (sim_cancelRequested()) {
      logLine("[CALL] Cancel requested while ringing");
      goto cleanup;
    }
    while (simSerial.available()) {
      char c = simSerial.read();
      res += c;
      Serial.write(c);

      // Check call state indicators
      if (res.indexOf("VOICE CALL: BEGIN") >= 0) {
        logLine("[CALL] ANSWERED!");
        answered = true;
        // Wait for call to end
        unsigned long callStart = millis();
        while (millis() - callStart < 120000UL) { // max 2min
          if (sim_cancelRequested()) {
            logLine("[CALL] Cancel requested during active call");
            goto cleanup;
          }
          while (simSerial.available()) {
            char cc = simSerial.read();
            res += cc;
            Serial.write(cc);
          }
          if (res.indexOf("NO CARRIER") >= 0 ||
              res.indexOf("VOICE CALL: END") >= 0) {
            break;
          }
          vTaskDelay(pdMS_TO_TICKS(50));
        }
        goto cleanup;
      }

      // Call rejected / failed
      if (res.indexOf("NO CARRIER") >= 0 || res.indexOf("BUSY") >= 0 ||
          res.indexOf("NO ANSWER") >= 0 || res.indexOf("ERROR") >= 0 ||
          res.indexOf("VOICE CALL: END") >= 0) {
          logLine("[CALL] Not answered / rejected");
          goto cleanup;
      }
    }
    vTaskDelay(pdMS_TO_TICKS(50));
  }

  logLine("[CALL] Ring timeout");

cleanup:
  simSerial.println("ATH");
  delay(500);
  // Drain
  while (simSerial.available())
    simSerial.read();

  if (simMutex)
    xSemaphoreGive(simMutex);
  return answered;
}

// ============================================================
// Call cascade: CALL_1 -> CALL_2 -> CALL_3 -> HOTLINE
// Stops if any call is answered.
// ============================================================
void SIM7680C_callCascade() {
  ConfigSnapshot cfg = {};
  getConfigSnapshot(&cfg);
  const char *numbers[] = {cfg.call1, cfg.call2, cfg.call3, cfg.hotline};
  const char *labels[] = {"CALL_1", "CALL_2", "CALL_3", "HOTLINE"};

  for (int i = 0; i < 4; i++) {
    if (sim_cancelRequested()) {
      logLine("[CALL] Cascade cancelled");
      return;
    }
    if (strlen(numbers[i]) < 3) {
      logPrintf("[CALL] %s empty, skip", labels[i]);
      continue;
    }
    logPrintf("[CALL] Cascade step %d: %s -> %s", i + 1, labels[i], numbers[i]);
    if (SIM7680C_callNumber(numbers[i], cfg.ringSeconds)) {
      logPrintf("[CALL] %s answered, cascade done", labels[i]);
      return;
    }
    if (sim_cancelRequested()) {
      logLine("[CALL] Cascade cancelled after step");
      return;
    }
    delay(2000); // brief pause between attempts
  }
  logLine("[CALL] Cascade exhausted, nobody answered");
}

// ============================================================
// HTTP POST via modem
// ============================================================
bool SIM7680C_httpPost(const String &url, const String &contentType,
                       const String &body) {
  if (!SIM_hasCapability(SIM_CAP_DATA_OK) && !sim_detectDataSession())
    return false;
  if (telemetryIsSosActive())
    return false; // don't use modem during SOS
  if (simMutex)
    xSemaphoreTake(simMutex, portMAX_DELAY);

  simSerial.println("AT+HTTPINIT");
  delay(200);
  simSerial.println("AT+HTTPPARA=\"CID\",1");
  delay(100);
  simSerial.printf("AT+HTTPPARA=\"URL\",\"%s\"\r\n", url.c_str());
  delay(200);
  simSerial.printf("AT+HTTPPARA=\"CONTENT\",\"%s\"\r\n", contentType.c_str());
  delay(200);

  simSerial.printf("AT+HTTPDATA=%d,5000\r\n", body.length());
  delay(300);
  simSerial.print(body);
  delay(300);

  simSerial.println("AT+HTTPACTION=1"); // POST

  String response = sim_readResponse(8000);
  bool ok = false;
  telemetrySetTrackSimCode(-1);

  int si = response.indexOf("+HTTPACTION: 1,");
  if (si != -1) {
    int ci = response.indexOf(",", si + 15);
    if (ci != -1) {
      String st = response.substring(si + 15, ci);
      int statusCode = st.toInt();
      telemetrySetTrackSimCode(statusCode);
      logPrintf("[SIM7680C] HTTP Status: %s", st.c_str());
      ok = (statusCode >= 200 && statusCode < 300);
    }
  }

  simSerial.println("AT+HTTPTERM");
  delay(200);
  while (simSerial.available())
    simSerial.read();

  if (simMutex)
    xSemaphoreGive(simMutex);

  if (ok)
    SIM_setCapability(SIM_CAP_HTTP_OK);
  else if (SIM_hasCapability(SIM_CAP_HTTP_OK))
    SIM_setCapability(SIM_CAP_DATA_OK);

  return ok;
}
