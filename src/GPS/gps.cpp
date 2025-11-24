#include "gps.h"
#include <AssistNow/assistnow.h>
#include <WiFi.h>

HardwareSerial SerialGPS(1);
TinyGPSPlus gps;

float currentLat = 0.0f;
float currentLng = 0.0f;

static double lastLat = 0;
static double lastLng = 0;

double GPS_getLatitude() { return lastLat; }
double GPS_getLongitude() { return lastLng; }
// ---------------------- UBX CONFIG -------------------------

// Enable NMEA output on UART1 (IMPORTANT)
const uint8_t CFG_NMEA_UART1[] = {
    0xB5, 0x62, 0x06, 0x00, 0x14, 0x00,
    0x01, 0x00, // PortID = 1 (UART1)
    0x00, 0x00,
    0xD0, 0x08, 0x00, 0x00, // inProtoMask = UBX+NMEA
    0x01, 0x00, 0x00, 0x00, // outProtoMask = NMEA ONLY
    0x00, 0x00,
    0x00, 0x00,
    0x00, 0x00};

// Turn ON NMEA-GGA @ 1Hz
const uint8_t CFG_NMEA_GGA_ON[] = {
    0xB5, 0x62, 0x06, 0x01, 0x08, 0x00,
    0xF0, 0x00, // GGA
    0x01,       // rate=1
    0, 0, 0, 0, 0,
    0xFA, 0x0F};

// Turn ON NMEA-RMC @ 1Hz
const uint8_t CFG_NMEA_RMC_ON[] = {
    0xB5, 0x62, 0x06, 0x01, 0x08, 0x00,
    0xF0, 0x04, // RMC
    0x01,
    0, 0, 0, 0, 0,
    0xFE, 0x2B};

// Turn OFF UBX NAV-PVT (binary spam)
const uint8_t CFG_UBX_PVT_OFF[] = {
    0xB5, 0x62, 0x06, 0x01, 0x08, 0x00,
    0x01, 0x07, // NAV-PVT
    0x00,
    0, 0, 0, 0, 0,
    0x11, 0x4B};

// GPS + Galileo only (fastest fix)
const uint8_t CFG_GNSS_FAST[] = {
    0xB5, 0x62, 0x06, 0x3E, 0x3C, 0x00,
    0x00, 0x08, 0x20, 0x00,

    // GPS ON
    0x00, 0x00, 0x10, 0x04, 0x01, 0x00, 0x01, 0x01,

    // Galileo ON
    0x02, 0x00, 0x10, 0x04, 0x01, 0x00, 0x01, 0x01,

    // SBAS OFF
    0x01, 0x00, 0x10, 0x04, 0x00, 0x00, 0x01, 0x01,

    // GLONASS OFF
    0x06, 0x00, 0x10, 0x04, 0x00, 0x00, 0x01, 0x01,

    // BeiDou OFF
    0x03, 0x00, 0x10, 0x04, 0x00, 0x00, 0x01, 0x01,

    // Reserved
    0x00, 0x00, 0x00, 0x00};

// 5Hz update rate
const uint8_t CFG_RATE_5HZ[] = {
    0xB5, 0x62, 0x06, 0x08, 0x06, 0x00,
    0xC8, 0x00, // 200ms
    0x01, 0x00,
    0x01, 0x00,
    0xDD, 0x68};

// UBX-CFG-RST: Hotstart reset
const uint8_t CFG_RESET_HOT[] = {
    0xB5, 0x62, // UBX header
    0x06, 0x04, // Class = CFG, ID = RST
    0x04, 0x00, // Length = 4
    0x00, 0x00, // navBbrMask = 0 (hotstart)
    0x01, 0x00, // resetMode = 1 (controlled GNSS reset)
    0x0F, 0x38  // checksum
};

// ---------------------- SEND UBX ---------------------------
void sendUBX(const uint8_t *msg, uint16_t len)
{
    Serial.print("[UBX] >> ");
    for (int i = 0; i < len; i++)
    {
        Serial.printf("%02X ", msg[i]);
        SerialGPS.write(msg[i]);
    }
    Serial.println();
}

// ---------------------- RAW GPS LOG ------------------------
void logRawGPS()
{
    while (SerialGPS.available())
    {
        char c = SerialGPS.read();
        Serial.print(c); // Show raw NMEA
        gps.encode(c);   // TinyGPS decode
    }
}

// ==========================================================
// === BƯỚC 2 – LẤY UBX-SEC-UNIQID & UBX-MON-VER CHO ZTP  ====

void readUBXHex(uint16_t timeout = 400)
{
    unsigned long start = millis();
    while (millis() - start < timeout)
    {
        if (SerialGPS.available())
        {
            uint8_t b = SerialGPS.read();
            Serial.printf("%02X", b);
        }
    }
    Serial.println();
}

// Poll UBX commands
const uint8_t POLL_UNIQID[] = {0xB5, 0x62, 0x27, 0x03, 0x00, 0x00, 0x2A, 0xA5};
const uint8_t POLL_MONVER[] = {0xB5, 0x62, 0x0A, 0x04, 0x00, 0x00, 0x0E, 0x34};

// HÀM GỌI LẤY 2 CHUỖI DÙNG CHO ASSISTNOW ZTP
void getNeo10ChipInfo()
{
    Serial.println("\n========== LẤY UBX-SEC-UNIQID ==========");
    SerialGPS.write(POLL_UNIQID, sizeof(POLL_UNIQID));
    vTaskDelay(pdMS_TO_TICKS(200));
    Serial.print("UNIQID HEX: ");
    readUBXHex();

    Serial.println("\n========== LẤY UBX-MON-VER =============");
    SerialGPS.write(POLL_MONVER, sizeof(POLL_MONVER));
    vTaskDelay(pdMS_TO_TICKS(300));
    Serial.print("MON_VER HEX: ");
    readUBXHex();

    Serial.println("\n[ZTP] Copy 2 chuỗi hex này để gửi lên AssistNow!");
}

// ---------------------- GPS TASK ---------------------------
void gpsTask(void *pvParameters)
{
    SerialGPS.begin(38400, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
    Serial.println("[GPS] Init NEO-M10...");
    vTaskDelay(1200);

    // ============================================================
    // 1) THỬ DOWNLOAD ASSISTNOW (không có mạng → bỏ qua)
    // ============================================================
    bool hasAGPS = false;

    if (WiFi.status() == WL_CONNECTED)
    {
        Serial.println("[AssistNow] Downloading...");

        const int MAX_RETRY = 3;
        bool ok = false;

        for (int i = 1; i <= MAX_RETRY; i++)
        {
            Serial.printf("[AssistNow] Try %d/%d...\n", i, MAX_RETRY);

            if (downloadAssistNow()) // return true nếu load OK
            {
                Serial.println("[AssistNow] Download OK");
                ok = true;
                break;
            }

            Serial.println("[AssistNow] Download FAILED");
            vTaskDelay(pdMS_TO_TICKS(300)); // đợi 300ms rồi thử lại
        }

        if (ok)
        {
            // ========================================================
            // 2) INJECT A-GPS
            // ========================================================
            Serial.println("[AssistNow] Injecting...");

            if (injectAssistNow(SerialGPS))
            {
                Serial.println("[AssistNow] Inject OK");
                hasAGPS = true;

                // Reset nóng sau inject
                sendUBX(CFG_RESET_HOT, sizeof(CFG_RESET_HOT));
                vTaskDelay(300);
            }
            else
            {
                Serial.println("[AssistNow] Inject FAILED");
            }
        }
        else
        {
            Serial.println("[AssistNow] All retry FAILED → dùng cấu hình mặc định");
        }
    }
    else
    {
        Serial.println("[AssistNow] No network → dùng cấu hình mặc định");
    }

    // ============================================================
    // 3) CONFIG GPS (luôn chạy dù có A-GPS hay không)
    // ============================================================
    Serial.println("[GPS] Configuring...");

    sendUBX(CFG_NMEA_UART1, sizeof(CFG_NMEA_UART1));
    vTaskDelay(20);

    sendUBX(CFG_UBX_PVT_OFF, sizeof(CFG_UBX_PVT_OFF));
    vTaskDelay(20);

    sendUBX(CFG_NMEA_GGA_ON, sizeof(CFG_NMEA_GGA_ON));
    sendUBX(CFG_NMEA_RMC_ON, sizeof(CFG_NMEA_RMC_ON));
    vTaskDelay(20);

    sendUBX(CFG_GNSS_FAST, sizeof(CFG_GNSS_FAST));
    vTaskDelay(20);

    sendUBX(CFG_RATE_5HZ, sizeof(CFG_RATE_5HZ));
    vTaskDelay(20);

    Serial.println("[GPS] Configuration DONE.");

    // ============================================================
    // 4) LOOP ĐỌC NMEA
    // ============================================================
    setColor(255, 0, 0); // đỏ = chưa fix

    while (true)
    {
        while (SerialGPS.available())
            gps.encode(SerialGPS.read());

        if (gps.location.isUpdated())
        {
            currentLat = gps.location.lat();
            currentLng = gps.location.lng();

            lastLat = currentLat;
            lastLng = currentLng;

            setColor(0, 255, 0); // xanh = FIX
        }

        vTaskDelay(pdMS_TO_TICKS(50));
    }
}

// ---------------------- GET GPS LINK -----------------------
String getGPSLink()
{
    char buffer[100];

    Serial.printf("[GPS] getGPSLink(): LAT=%.6f LNG=%.6f\n",
                  currentLat, currentLng);

    if (currentLat == 0 || currentLng == 0)
    {
        Serial.println("[GPS] NO FIX → return fallback");

        setColor(255, 0, 0);

        double lat = atof(GPS_LOCAL_LAT);
        double lng = atof(GPS_LOCAL_LNG);

        sprintf(buffer, "https://www.google.com/maps?q=%.6f,%.6f",
                lat, lng);

        GPS_LAT = lat;
        GPS_LNG = lng;
    }
    else
    {
        sprintf(buffer, "https://www.google.com/maps?q=%.6f,%.6f",
                currentLat, currentLng);

        Serial.printf("[GPS] Link: %s\n", buffer);

        GPS_LAT = currentLat;
        GPS_LNG = currentLng;

        Serial.println("[NVS] Saving GPS...");

        esp_err_t err;

        err = nvs_set_blob(nvsHandle, "GPS_LAT", &GPS_LAT, sizeof(GPS_LAT));
        Serial.printf("[NVS] LAT save: %s\n", esp_err_to_name(err));

        err = nvs_set_blob(nvsHandle, "GPS_LNG", &GPS_LNG, sizeof(GPS_LNG));
        Serial.printf("[NVS] LNG save: %s\n", esp_err_to_name(err));

        nvs_commit(nvsHandle);
        Serial.println("[NVS] Commit OK");
    }

    return String(buffer);
}
