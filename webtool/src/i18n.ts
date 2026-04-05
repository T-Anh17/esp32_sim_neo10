export type Locale = "en" | "vi";
export type ThemeMode = "dark" | "light";

export type AppCopy = {
  appEyebrow: string;
  appTitle: string;
  appDescription: string;
  liveMap: string;
  liveMapTitle: string;
  liveMapDescription: string;
  languageLabel: string;
  themeLabel: string;
  englishLabel: string;
  vietnameseLabel: string;
  darkLabel: string;
  lightLabel: string;
  loadingDevices: string;
  noDevices: string;
  noDevicesHint: string;
  online: string;
  offline: string;
  unknownSource: string;
  selectedDevice: string;
  chooseDevice: string;
  renamePlaceholder: string;
  save: string;
  saving: string;
  onlineNow: string;
  latitude: string;
  longitude: string;
  satellites: string;
  speed: string;
  accuracy: string;
  geofence: string;
  enabled: string;
  disabled: string;
  distanceToHome: string;
  insideGeofence: string;
  yes: string;
  no: string;
  movementHistory: string;
  noDeviceSelected: string;
  pointsLabel: string;
  loadingHistory: string;
  noHistory: string;
  lastUpdated: string;
  homeLabel: string;
  rangeLabels: Record<"30m" | "6h" | "24h" | "7d", string>;
};

export const translations: Record<Locale, AppCopy> = {
  en: {
    appEyebrow: "NEO10 Fleet",
    appTitle: "Device Locator",
    appDescription:
      "Realtime view for active ESP32 trackers, current position, and movement history.",
    liveMap: "Live map",
    liveMapTitle: "Current and historical positions",
    liveMapDescription:
      "Devices are pulled from the Cloudflare Worker API. The selected device also shows its path for the chosen time window.",
    languageLabel: "Language",
    themeLabel: "Theme",
    englishLabel: "English",
    vietnameseLabel: "Vietnamese",
    darkLabel: "Dark",
    lightLabel: "Light",
    loadingDevices: "Loading devices...",
    noDevices: "No active device data yet.",
    noDevicesHint:
      "Check that the tracker has posted to /update and the Cloudflare Worker is redeployed with the latest API code.",
    online: "online",
    offline: "offline",
    unknownSource: "unknown source",
    selectedDevice: "Selected device",
    chooseDevice: "Choose a device to inspect its current position.",
    renamePlaceholder: "Rename this tracker",
    save: "Save",
    saving: "Saving...",
    onlineNow: "online now",
    latitude: "Latitude",
    longitude: "Longitude",
    satellites: "Satellites",
    speed: "Speed",
    accuracy: "Accuracy",
    geofence: "Geofence",
    enabled: "enabled",
    disabled: "disabled",
    distanceToHome: "Distance to home",
    insideGeofence: "Inside geofence",
    yes: "yes",
    no: "no",
    movementHistory: "Movement history",
    noDeviceSelected: "No device selected",
    pointsLabel: "points",
    loadingHistory: "Loading history...",
    noHistory: "No historical positions available for this time range.",
    lastUpdated: "Last updated",
    homeLabel: "Home",
    rangeLabels: {
      "30m": "30 min",
      "6h": "6 hours",
      "24h": "24 hours",
      "7d": "7 days",
    },
  },
  vi: {
    appEyebrow: "NEO10 Fleet",
    appTitle: "Bản đồ thiết bị",
    appDescription:
      "Theo dõi thời gian thực các tracker ESP32 đang hoạt động, vị trí hiện tại và lịch sử di chuyển.",
    liveMap: "Bản đồ trực tiếp",
    liveMapTitle: "Vị trí hiện tại và lịch sử",
    liveMapDescription:
      "Dữ liệu được lấy từ Cloudflare Worker API. Thiết bị đang chọn sẽ hiển thị thêm đường đi trong khoảng thời gian đã chọn.",
    languageLabel: "Ngôn ngữ",
    themeLabel: "Giao diện",
    englishLabel: "Tiếng Anh",
    vietnameseLabel: "Tiếng Việt",
    darkLabel: "Tối",
    lightLabel: "Sáng",
    loadingDevices: "Đang tải danh sách thiết bị...",
    noDevices: "Chưa có dữ liệu thiết bị hoạt động.",
    noDevicesHint:
      "Kiểm tra firmware đã gửi dữ liệu lên /update và Cloudflare Worker đã được deploy lại với code mới nhất.",
    online: "đang online",
    offline: "đang offline",
    unknownSource: "không rõ nguồn",
    selectedDevice: "Thiết bị đang chọn",
    chooseDevice: "Hãy chọn một thiết bị để xem vị trí hiện tại.",
    renamePlaceholder: "Đổi tên thiết bị này",
    save: "Lưu",
    saving: "Đang lưu...",
    onlineNow: "đang online",
    latitude: "Vĩ độ",
    longitude: "Kinh độ",
    satellites: "Số vệ tinh",
    speed: "Tốc độ",
    accuracy: "Độ chính xác",
    geofence: "Hàng rào địa lý",
    enabled: "bật",
    disabled: "tắt",
    distanceToHome: "Khoảng cách tới HOME",
    insideGeofence: "Nằm trong vùng",
    yes: "có",
    no: "không",
    movementHistory: "Lịch sử di chuyển",
    noDeviceSelected: "Chưa chọn thiết bị",
    pointsLabel: "điểm",
    loadingHistory: "Đang tải lịch sử...",
    noHistory: "Không có điểm lịch sử trong khoảng thời gian này.",
    lastUpdated: "Cập nhật lúc",
    homeLabel: "HOME",
    rangeLabels: {
      "30m": "30 phút",
      "6h": "6 giờ",
      "24h": "24 giờ",
      "7d": "7 ngày",
    },
  },
};

export function formatRelativeAge(ageSeconds: number, locale: Locale) {
  if (ageSeconds < 60) {
    return locale === "vi" ? `${ageSeconds} giây trước` : `${ageSeconds}s ago`;
  }
  if (ageSeconds < 3600) {
    const minutes = Math.floor(ageSeconds / 60);
    return locale === "vi" ? `${minutes} phút trước` : `${minutes}m ago`;
  }
  if (ageSeconds < 86400) {
    const hours = Math.floor(ageSeconds / 3600);
    return locale === "vi" ? `${hours} giờ trước` : `${hours}h ago`;
  }
  const days = Math.floor(ageSeconds / 86400);
  return locale === "vi" ? `${days} ngày trước` : `${days}d ago`;
}

export function formatTimestamp(timestamp: number, locale: Locale, withDate = true) {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    ...(withDate ? { day: "2-digit", month: "short" } : {}),
  }).format(timestamp);
}
