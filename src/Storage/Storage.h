#ifndef STORAGE_H
#define STORAGE_H

#include <nvs_flash.h>
#include <nvs.h>
#include <Config.h>
#include "server.h"

void initStorage();
void loadDataFromRom();
void saveDataToRom(const String &phone, const String &sms);
#endif