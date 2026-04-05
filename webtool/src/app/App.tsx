import { useEffect, useMemo, useState } from "react";
import { DeviceDetails } from "../features/devices/DeviceDetails";
import { DeviceSidebar } from "../features/devices/DeviceSidebar";
import { HistoryTimeline } from "../features/history/HistoryTimeline";
import { TrackerMap } from "../features/map/TrackerMap";
import {
  formatTimestamp,
  translations,
  type Locale,
  type ThemeMode,
} from "../i18n";
import {
  fetchDevices,
  fetchHistory,
  renameDevice,
} from "../services/api/trackerApi";
import type {
  HistoryRange,
  TrackerDeviceSummary,
  TrackerHistoryPoint,
} from "../types/tracker";

const REFRESH_INTERVAL_MS = 60000;
const rangeOptions: HistoryRange[] = ["30m", "6h", "24h", "7d"];

const STORAGE_KEYS = {
  locale: "neo10-webtool-locale",
  theme: "neo10-webtool-theme",
} as const;

function getInitialLocale(): Locale {
  const saved = window.localStorage.getItem(STORAGE_KEYS.locale);
  if (saved === "en" || saved === "vi") return saved;
  return window.navigator.language.toLowerCase().startsWith("vi") ? "vi" : "en";
}

function getInitialTheme(): ThemeMode {
  const saved = window.localStorage.getItem(STORAGE_KEYS.theme);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function App() {
  const [devices, setDevices] = useState<TrackerDeviceSummary[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [historyRange, setHistoryRange] = useState<HistoryRange>("24h");
  const [history, setHistory] = useState<TrackerHistoryPoint[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale>(getInitialLocale);
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const copy = translations[locale];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = locale;
    window.localStorage.setItem(STORAGE_KEYS.theme, theme);
    window.localStorage.setItem(STORAGE_KEYS.locale, locale);
  }, [locale, theme]);

  useEffect(() => {
    let cancelled = false;

    const loadDevices = async () => {
      try {
        if (!cancelled) setLoadingDevices(true);
        const nextDevices = await fetchDevices();
        if (cancelled) return;
        setDevices(nextDevices);
        setLastUpdatedAt(Date.now());
        setSelectedDeviceId((current) => {
          if (current && nextDevices.some((d) => d.deviceId === current)) return current;
          return nextDevices[0]?.deviceId ?? null;
        });
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message :
            locale === "vi" ? "Không tải được danh sách thiết bị." : "Failed to load devices.");
        }
      } finally {
        if (!cancelled) setLoadingDevices(false);
      }
    };

    loadDevices();
    const timer = window.setInterval(loadDevices, REFRESH_INTERVAL_MS);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [locale]);

  const selectedDevice = useMemo(
    () => devices.find((d) => d.deviceId === selectedDeviceId) ?? null,
    [devices, selectedDeviceId]
  );

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      if (!selectedDeviceId) { setHistory([]); return; }
      try {
        setLoadingHistory(true);
        const points = await fetchHistory(selectedDeviceId, historyRange);
        if (!cancelled) setHistory(points);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message :
            locale === "vi" ? "Không tải được lịch sử." : "Failed to load history.");
        }
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    };

    loadHistory();
    return () => { cancelled = true; };
  }, [locale, selectedDeviceId, historyRange]);

  const handleRename = async (deviceId: string, nextName: string) => {
    const trimmed = nextName.trim();
    if (!trimmed) return;
    const updatedName = await renameDevice(deviceId, trimmed);
    setDevices((prev) =>
      prev.map((d) => d.deviceId === deviceId ? { ...d, deviceName: updatedName } : d)
    );
  };

  const onlineCount = devices.filter((d) => d.online).length;

  return (
    <>
      {/* ── TOP NAVBAR ───────────────────────────────────────────────── */}
      <nav className="navbar">
        {/* Brand */}
        <div className="navbar__brand">
          <div className="navbar__logo">N</div>
          <div>
            <div className="navbar__title">NEO10</div>
          </div>
        </div>

        <div className="navbar__sep" />

        {/* Center nav */}
        <div className="navbar__center">
          <button className="navbar__nav-item is-active" type="button">
            <span>⬡</span>
            {copy.liveMap}
          </button>
        </div>

        {/* Right controls */}
        <div className="navbar__right">
          {lastUpdatedAt ? (
            <div className="refresh-badge">
              <span className="refresh-badge__dot" />
              {formatTimestamp(lastUpdatedAt, locale)}
            </div>
          ) : null}

          {/* Language toggle */}
          <div className="toggle-group" style={{ width: "auto" }}>
            <button
              className={locale === "vi" ? "toggle-button is-active" : "toggle-button"}
              onClick={() => setLocale("vi")}
              type="button"
              title={copy.vietnameseLabel}
            >VI</button>
            <button
              className={locale === "en" ? "toggle-button is-active" : "toggle-button"}
              onClick={() => setLocale("en")}
              type="button"
              title={copy.englishLabel}
            >EN</button>
          </div>

          {/* Theme toggle */}
          <button
            className="icon-btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            type="button"
            title={theme === "dark" ? copy.lightLabel : copy.darkLabel}
          >
            {theme === "dark" ? "☀" : "◑"}
          </button>
        </div>
      </nav>

      {/* ── SHELL ────────────────────────────────────────────────────── */}
      <div className="shell">

        {/* SIDEBAR */}
        <aside className="shell__sidebar">

          {/* Fleet overview */}
          <div className="sidebar-section">
            <div className="sidebar-label">{copy.appEyebrow}</div>
            <div className="panel" style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "1.65rem", fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1 }}>
                    {devices.length}
                  </div>
                  <div className="muted" style={{ marginTop: 2 }}>{copy.appDescription.split(",")[0]}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{
                    fontSize: "1.2rem", fontWeight: 800, color: "var(--cyan-400)",
                    lineHeight: 1, letterSpacing: "-0.04em"
                  }}>{onlineCount}</div>
                  <div className="muted" style={{ marginTop: 2 }}>{copy.online}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="divider" />

          {/* Time range */}
          <div className="sidebar-section">
            <div className="sidebar-label">{copy.movementHistory}</div>
            <div className="range-picker">
              {rangeOptions.map((opt) => (
                <button
                  key={opt}
                  className={opt === historyRange ? "range-pill is-active" : "range-pill"}
                  onClick={() => setHistoryRange(opt)}
                  type="button"
                >
                  {copy.rangeLabels[opt]}
                </button>
              ))}
            </div>
          </div>

          <div className="divider" />

          {/* Device list */}
          <div className="sidebar-section" style={{ flex: 1 }}>
            <div className="sidebar-label">
              {copy.selectedDevice} ({devices.length})
            </div>
            <DeviceSidebar
              copy={copy}
              devices={devices}
              locale={locale}
              loading={loadingDevices}
              selectedDeviceId={selectedDeviceId}
              onSelect={setSelectedDeviceId}
            />
            {!loadingDevices && !error && !devices.length ? (
              <p className="panel-note">{copy.noDevicesHint}</p>
            ) : null}
          </div>

        </aside>

        {/* MAIN */}
        <main className="shell__main">

          {/* Hero header */}
          <section className="hero-card">
            <div className="hero-card__top">
              <div>
                <p className="eyebrow">{copy.liveMap}</p>
                <h2>{copy.liveMapTitle}</h2>
                <p className="muted" style={{ marginTop: 6 }}>{copy.liveMapDescription}</p>
              </div>
              {lastUpdatedAt || devices.length ? (
                <div className="hero-meta">
                  {devices.length > 0 && (
                    <span className="stat-badge">
                      ◉ {onlineCount}/{devices.length} {copy.online}
                    </span>
                  )}
                  {lastUpdatedAt && (
                    <span className="hero-meta__pill">
                      ↻ {copy.lastUpdated}: {formatTimestamp(lastUpdatedAt, locale)}
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          </section>

          {error ? <div className="error-banner">{error}</div> : null}

          {/* Dashboard grid */}
          <div className="dashboard-grid">
            <TrackerMap
              devices={devices}
              history={history}
              homeLabel={copy.homeLabel}
              selectedDeviceId={selectedDeviceId}
              theme={theme}
            />
            <div className="dashboard-stack">
              <DeviceDetails
                copy={copy}
                device={selectedDevice}
                loading={loadingDevices}
                onRename={handleRename}
              />
              <HistoryTimeline
                copy={copy}
                locale={locale}
                points={history}
                loading={loadingHistory}
                selectedDeviceName={selectedDevice?.deviceName ?? null}
              />
            </div>
          </div>

        </main>
      </div>
    </>
  );
}
