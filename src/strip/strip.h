
#ifndef strip_H_
#define strip_H_

#include <Adafruit_NeoPixel.h>

void setColor(uint8_t red, uint8_t green, uint8_t blue);
void initStrip();
void setBrightness(uint8_t b);

#endif