#include "sim7680c.h"
#include <freertos/semphr.h>

HardwareSerial simSerial(2);
static SemaphoreHandle_t simMutex = NULL;
static const char *WEB_VIEWER_URL = "https://gps-tracker.ahcntab.workers.dev/viewer?id=TRACKER_001";

static void lockSim()
{
    if (simMutex == NULL)
    {
        simMutex = xSemaphoreCreateMutex();
    }
    if (simMutex != NULL)
    {
        xSemaphoreTake(simMutex, portMAX_DELAY);
    }
}

static void unlockSim()
{
    if (simMutex != NULL)
    {
        xSemaphoreGive(simMutex);
    }
}

// ------------------------------------------------------------
// RÚT GỌN KHỞI TẠO
// ------------------------------------------------------------
void init_sim7680c()
{
    Serial.println("[SIM7680C] Init...");

    lockSim();
    simSerial.begin(MCU_SIM_BAUDRATE, SERIAL_8N1, SIM_RX_PIN, SIM_TX_PIN);

    // Handshake
    bool ready = false;
    for (int i = 0; i < 10; i++)
    {
        simSerial.println("AT");
        delay(100);
        if (simSerial.find("OK"))
        {
            ready = true;
            break;
        }
    }

    if (!ready)
    {
        Serial.println("[SIM7680C] ❌ No response!");
        unlockSim();
        return;
    }

    simSerial.println("AT+CGATT=1");
    delay(100);

    simSerial.println("AT+CGDCONT=1,\"IP\",\"v-internet\""); // Viettel
    delay(100);

    simSerial.println("AT+CGACT=1,1");
    delay(100);

    Serial.println("[SIM7680C] Ready");

    // Các lệnh cấu hình cần thiết (đã rút gọn log)
    const char *cmds[] = {
        "AT+CPIN?",
        "AT+CSQ",
        "AT+CREG?",
        "AT+COPS?",
        "AT+CPSI?",
        "AT+CMGF=1", // SMS text mode
    };

    for (auto &cmd : cmds)
    {
        simSerial.println(cmd);
        delay(150);

        // đọc nhanh, không in ra Serial để tránh spam
        unsigned long t = millis();
        while (millis() - t < 300)
            if (simSerial.available())
                simSerial.read(); // bỏ qua nội dung – KHÔNG IN
    }

    Serial.println("[SIM7680C] Init done.");
    unlockSim();
}

// ------------------------------------------------------------
// CHECK ĐĂNG KÝ MẠNG (RÚT GỌN)
// ------------------------------------------------------------
bool sim_isRegistered()
{
    lockSim();
    simSerial.println("AT+CREG?");
    delay(200);

    String r = "";
    unsigned long t = millis();
    while (millis() - t < 500)
        if (simSerial.available())
            r += char(simSerial.read());

    // Không in log – tránh spam
    bool ok = (r.indexOf(",1") > 0 || r.indexOf(",5") > 0);
    unlockSim();
    return ok;
}

// ------------------------------------------------------------
// GỬI SMS (giữ nguyên logic)
// ------------------------------------------------------------
void SIM7680C_sendSMS(const String &mapLink)
{
    String message = String(SMS) + " - Link: " + mapLink + " - Web: " + WEB_VIEWER_URL;

    Serial.println("[SIM7680C] Sending SMS...");

    lockSim();
    simSerial.printf("AT+CMGS=\"%s\"\r\n", PHONE);
    delay(300);

    simSerial.print(message);
    delay(100);

    simSerial.write(26); // Ctrl+Z kết thúc SMS

    // Đọc phản hồi ngắn
    unsigned long start = millis();
    while (millis() - start < 4000)
        if (simSerial.available())
            Serial.write(simSerial.read());

    Serial.println("[SIM7680C] Done.");
    unlockSim();
}

// ------------------------------------------------------------
// CALL
// ------------------------------------------------------------
void SIM7680C_call()
{
    Serial.printf("[SIM7680C] Calling %s...\n", PHONE);
    lockSim();
    simSerial.printf("ATD%s;\r\n", PHONE);

    unsigned long start = millis();
    const unsigned long TIMEOUT = 10000; // 10 giây

    String res = "";

    while (millis() - start < TIMEOUT)
    {
        while (simSerial.available())
        {
            char c = simSerial.read();
            res += c;
            Serial.write(c);

            // ====== KIỂM TRA TRẠNG THÁI CUỘC GỌI ======
            if (res.indexOf("NO CARRIER") >= 0 ||
                res.indexOf("BUSY") >= 0 ||
                res.indexOf("NO ANSWER") >= 0 ||
                res.indexOf("ERROR") >= 0 ||
                res.indexOf("VOICE CALL: END") >= 0)
            {
                Serial.println("\n[CALL] Call ended or rejected.");
                simSerial.println("ATH");
                unlockSim();
                return;
            }
        }
        delay(10);
    }
    Serial.println("[CALL] Timeout, hang up.");
    simSerial.println("ATH");
    unlockSim();
}

void SIM7680C_httpPost(const String &url, const String &contentType, const String &body)
{
    lockSim();
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
    delay(3000);

    // in response
    while (simSerial.available())
    {
        Serial.write(simSerial.read());
    }

    simSerial.println("AT+HTTPTERM");
    unlockSim();
}

String SIM7680C_httpGet(const String &url)
{
    String response = "";
    lockSim();
    simSerial.println("AT+HTTPINIT");
    delay(200);

    simSerial.println("AT+HTTPPARA=\"CID\",1");
    delay(100);

    simSerial.printf("AT+HTTPPARA=\"URL\",\"%s\"\r\n", url.c_str());
    delay(200);

    simSerial.println("AT+HTTPACTION=0"); // GET
    delay(3000);

    simSerial.println("AT+HTTPREAD");
    unsigned long start = millis();
    while (millis() - start < 5000)
    {
        while (simSerial.available())
        {
            response += char(simSerial.read());
        }
        delay(10);
    }

    simSerial.println("AT+HTTPTERM");
    unlockSim();

    return response;
}

// ------------------------------------------------------------
// TASK KHỞI TẠO
// ------------------------------------------------------------
void task_init_sim7680c(void *pvParameters)
{
    init_sim7680c();
    vTaskDelete(NULL);
}
