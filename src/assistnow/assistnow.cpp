#include "assistnow.h"
#include <WiFiClientSecure.h>
#include <SPIFFS.h>

static const char *FILE_UBX = "/assistnow.ubx";
static const char *CHIPCODE = "RkNGNDM1MEUzNTU0OjUzRUVENjI0";

bool downloadAssistNow()
{
    if (!SPIFFS.begin(true))
        return false;

    WiFiClientSecure client;
    client.setInsecure();
    if (!client.connect("assistnow.services.u-blox.com", 443))
        return false;

    String url = String("GET /GetAssistNowData.ashx?chipcode=") +
                 CHIPCODE +
                 "&gnss=gps,bds,gal&data=uporb_1,ualm HTTP/1.1\r\n" // thay ulorb_l1 nếu bạn có Live Orbits
                 "Host: assistnow.services.u-blox.com\r\n"
                 "Connection: close\r\n\r\n";

    client.print(url);

    // bỏ header
    while (client.connected() && !client.available())
        delay(10);
    while (client.available())
    {
        if (client.readStringUntil('\n') == "\r")
            break;
    }

    File f = SPIFFS.open(FILE_UBX, FILE_WRITE);
    if (!f)
        return false;

    while (client.available())
    {
        uint8_t buf[256];
        int r = client.read(buf, sizeof(buf));
        if (r > 0)
            f.write(buf, r);

        vTaskDelay(1); // <=== FIX WATCHDOG !!!
    }

    f.close();
    return true;
}

bool injectAssistNow(HardwareSerial &gps)
{
    if (!SPIFFS.begin(true))
        return false;
    File f = SPIFFS.open(FILE_UBX, FILE_READ);
    if (!f)
        return false;

    while (f.available())
    {
        uint8_t buf[256];
        int r = f.read(buf, sizeof(buf));
        gps.write(buf, r);
        delay(5);
    }

    f.close();
    return true;
}
