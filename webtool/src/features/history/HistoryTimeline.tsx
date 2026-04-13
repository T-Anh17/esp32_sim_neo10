import { useState } from "react";
import { AppIcon } from "../../components/AppIcon";
import type { AppCopy, Locale } from "../../i18n";
import { formatRelativeAge, formatTimestamp } from "../../i18n";
import type { TrackerDeviceSummary, TrackerHistoryPoint } from "../../types/tracker";

type HistoryTimelineProps = {
  copy: AppCopy;
  deviceColorMap: Map<string, string>;
  historyMap: Map<string, TrackerHistoryPoint[]>;
  loading: boolean;
  locale: Locale;
  selectedDevices: TrackerDeviceSummary[];
};

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(distanceM: number) {
  if (distanceM >= 1000) return `${(distanceM / 1000).toFixed(2)} km`;
  return `${Math.round(distanceM)} m`;
}

/** Collapsible per-device history section */
function DeviceHistorySection({
  color,
  copy,
  device,
  locale,
  points,
}: {
  color: string;
  copy: AppCopy;
  device: TrackerDeviceSummary;
  locale: Locale;
  points: TrackerHistoryPoint[];
}) {
  const [expanded, setExpanded] = useState(false);
  const MAX_COLLAPSED = 5;

  const sorted = points
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    .sort((a, b) => b.timestamp - a.timestamp);

  const distanceM = sorted
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp)
    .reduce((sum, point, index, arr) => {
      const next = arr[index + 1];
      if (!next) return sum;
      return sum + haversineM(point.lat, point.lng, next.lat, next.lng);
    }, 0);

  const visiblePoints = expanded ? sorted : sorted.slice(0, MAX_COLLAPSED);
  const hiddenCount = sorted.length - MAX_COLLAPSED;

  return (
    <div className="history-device-section" style={{ borderLeftColor: color }}>
      <div className="history-device-section__header">
        <div className="history-device-section__info">
          <span className="history-device-section__swatch" style={{ background: color }} />
          <strong className="history-device-section__name">
            {device.deviceName || device.deviceId}
          </strong>
        </div>
        <div className="history-device-section__stats">
          <span>{sorted.length} {copy.pointsLabel}</span>
          <span>{formatDistance(distanceM)}</span>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="history-device-section__empty">{copy.noHistory}</div>
      ) : (
        <div className="history-device-section__list">
          {visiblePoints.map((point) => {
            const ageSeconds = Math.max(0, Math.round((Date.now() - point.timestamp) / 1000));
            return (
              <div
                className="history-point-row"
                key={`${point.deviceId}-${point.timestamp}`}
              >
                <span className="history-point-row__dot" style={{ background: color }} />
                <div className="history-point-row__content">
                  <div className="history-point-row__time">
                    <span>{formatTimestamp(point.timestamp, locale)}</span>
                    <span className="history-point-row__age">
                      {formatRelativeAge(ageSeconds, locale)}
                    </span>
                  </div>
                  <span className="history-point-row__coords">
                    {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                  </span>
                </div>
              </div>
            );
          })}
          {hiddenCount > 0 && (
            <button
              className="history-device-section__toggle"
              onClick={() => setExpanded((prev) => !prev)}
              type="button"
            >
              {expanded ? copy.showLessDevices : `+${hiddenCount} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function HistoryTimeline({
  copy,
  deviceColorMap,
  historyMap,
  loading,
  locale,
  selectedDevices,
}: HistoryTimelineProps) {
  if (loading) {
    return <div className="place-sheet__empty">{copy.loadingHistory}</div>;
  }

  if (!selectedDevices.length) {
    return <div className="place-sheet__empty">{copy.chooseDevice}</div>;
  }

  const hasAnyPoints = selectedDevices.some((d) => (historyMap.get(d.deviceId) ?? []).length > 0);

  if (!hasAnyPoints) {
    return <div className="place-sheet__empty">{copy.noHistory}</div>;
  }

  return (
    <div className="history-per-device">
      {selectedDevices.map((device) => (
        <DeviceHistorySection
          key={device.deviceId}
          color={deviceColorMap.get(device.deviceId) ?? "#9aa0a6"}
          copy={copy}
          device={device}
          locale={locale}
          points={historyMap.get(device.deviceId) ?? []}
        />
      ))}
    </div>
  );
}
