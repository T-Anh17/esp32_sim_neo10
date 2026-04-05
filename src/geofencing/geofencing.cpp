#include "geofencing.h"
#include <math.h>
#include <nvs.h>

// HOME_LAT and HOME_LNG are defined in Config.cpp
// They are loaded from NVS in Storage.cpp loadDataFromRom()

void initGeofencing() {
  // Config already loaded by loadDataFromRom() in Storage
  ConfigSnapshot cfg = {};
  getConfigSnapshot(&cfg);
  logPrintf("[GPS] Geofence: enabled=%d radius=%dm home=%.6f,%.6f",
            cfg.geofenceEnable ? 1 : 0, cfg.geofenceRadiusM, cfg.homeLat,
            cfg.homeLng);
}

void saveHomeLocation(double lat, double lng) {
  updateHomeConfig(lat, lng);

  nvs_set_blob(nvsHandle, "HOME_LAT", &lat, sizeof(lat));
  nvs_set_blob(nvsHandle, "HOME_LNG", &lng, sizeof(lng));
  nvs_commit(nvsHandle);

  logPrintf("[GPS] Home saved: %.6f, %.6f", lat, lng);
}

double calculateDistance(double lat1, double lng1, double lat2, double lng2) {
  if ((lat1 == 0 && lng1 == 0) || (lat2 == 0 && lng2 == 0))
    return -1.0;

  // Haversine formula
  double R = 6371e3; // metres
  double phi1 = lat1 * PI / 180;
  double phi2 = lat2 * PI / 180;
  double deltaPhi = (lat2 - lat1) * PI / 180;
  double deltaLambda = (lng2 - lng1) * PI / 180;

  double a = sin(deltaPhi / 2) * sin(deltaPhi / 2) + cos(phi1) * cos(phi2) *
                                                         sin(deltaLambda / 2) *
                                                         sin(deltaLambda / 2);
  double c = 2 * atan2(sqrt(a), sqrt(1 - a));

  return R * c;
}
