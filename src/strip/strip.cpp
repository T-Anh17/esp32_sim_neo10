#include "strip.h"

#define LED_PIN 38
Adafruit_NeoPixel strip(1, LED_PIN, NEO_GRB + NEO_KHZ800);

uint8_t Tred = 0, Tgreen = 0, Tblue = 0;

void setColor(uint8_t red, uint8_t green, uint8_t blue)
{
    if (Tred == red && Tgreen == green && Tblue == blue)
        return;
    Tred = red;
    Tgreen = green;
    Tblue = blue;
    for (uint16_t i = 0; i < strip.numPixels(); i++)
    {
        strip.setPixelColor(i, strip.Color(red, green, blue));
    }
    strip.show();
}
void setBrightness(uint8_t b)
{
    strip.setBrightness(b);
    strip.show();
}

void initStrip()
{
    strip.begin();
    strip.show();
    strip.setBrightness(1);
    setColor(0, 0, 255);
}