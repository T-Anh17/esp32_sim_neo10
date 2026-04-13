import { useEffect, useState } from "react";
import type { AppCopy } from "../../i18n";
import type { TrackerDeviceSummary } from "../../types/tracker";
import { AppIcon } from "../../components/AppIcon";

type DeviceDetailsProps = {
  copy: AppCopy;
  selectedDevices: TrackerDeviceSummary[];
  deviceColorMap: Map<string, string>;
  loading: boolean;
  onFetchCurrentLocation: (deviceId: string) => Promise<void>;
  onRename: (deviceId: string, deviceName: string) => Promise<void>;
};

function formatCoordinate(value?: number) {
  return typeof value === "number" ? value.toFixed(6) : "--";
}

function formatDistance(value?: number) {
  if (typeof value !== "number" || value < 0) return "--";
  if (value >= 1000) return `${(value / 1000).toFixed(2)} km`;
  return `${Math.round(value)} m`;
}

function DeviceCard({
  copy,
  device,
  color,
  onFetchCurrentLocation,
  onRename,
}: {
  copy: AppCopy;
  device: TrackerDeviceSummary;
  color: string;
  onFetchCurrentLocation: (deviceId: string) => Promise<void>;
  onRename: (deviceId: string, deviceName: string) => Promise<void>;
}) {
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showRename, setShowRename] = useState(false);

  useEffect(() => {
    setDraftName(device.deviceName ?? "");
  }, [device.deviceId, device.deviceName]);

  return (
    <div className="device-detail-card" style={{ borderLeftColor: color }}>
      <div className="device-detail-card__header">
        <div className="device-detail-card__info">
          <span
            className="device-detail-card__color"
            style={{ background: color }}
          />
          <strong className="device-detail-card__name">
            {device.deviceName || device.deviceId}
          </strong>
          <span
            className={`device-detail-card__status-dot ${device.online ? "online" : "offline"}`}
          />
        </div>
        <div className="device-detail-card__actions">
          <button
            className="device-detail-card__icon-btn"
            onClick={() => setShowRename((prev) => !prev)}
            type="button"
            title={copy.renamePlaceholder}
          >
            <AppIcon name="edit" size={12} />
          </button>
          <button
            className="device-detail-card__icon-btn"
            disabled={refreshing}
            onClick={async () => {
              setRefreshing(true);
              try {
                await onFetchCurrentLocation(device.deviceId);
              } finally {
                setRefreshing(false);
              }
            }}
            type="button"
            title={copy.fetchCurrentLocation}
          >
            <AppIcon name="refresh" size={12} />
          </button>
        </div>
      </div>

      {showRename && (
        <div className="device-detail-card__rename">
          <div className="maps-rename-row">
            <input
              className="maps-text-input maps-text-input--sm"
              onChange={(event) => setDraftName(event.target.value)}
              placeholder={copy.renamePlaceholder}
              value={draftName}
            />
            <button
              className="maps-action-button maps-action-button--sm"
              disabled={
                saving ||
                !draftName.trim() ||
                draftName.trim() === device.deviceName
              }
              onClick={async () => {
                setSaving(true);
                try {
                  await onRename(device.deviceId, draftName.trim());
                } finally {
                  setSaving(false);
                }
              }}
              type="button"
            >
              <span>{saving ? copy.saving : copy.save}</span>
            </button>
          </div>
        </div>
      )}

      <div className="device-detail-card__metrics">
        {/* <div className="device-detail-card__metric">
          <span className="device-detail-card__metric-label">{copy.accuracy}</span>
          <strong>{formatDistance(device.locAccuracyM)}</strong>
        </div> */}
        <div className="device-detail-card__metric">
          <span className="device-detail-card__metric-label">
            {copy.latitude}
          </span>
          <strong>{formatCoordinate(device.lat)}</strong>
        </div>
        <div className="device-detail-card__metric">
          <span className="device-detail-card__metric-label">
            {copy.longitude}
          </span>
          <strong>{formatCoordinate(device.lng)}</strong>
        </div>
        <div className="device-detail-card__metric">
          <span className="device-detail-card__metric-label">
            {copy.distanceToHome}
          </span>
          <strong>{formatDistance(device.distanceToHomeM)}</strong>
        </div>
      </div>
    </div>
  );
}

export function DeviceDetails({
  copy,
  selectedDevices,
  deviceColorMap,
  loading,
  onFetchCurrentLocation,
  onRename,
}: DeviceDetailsProps) {
  if (loading) {
    return <div className="place-sheet__empty">{copy.loadingDevices}</div>;
  }

  if (selectedDevices.length === 0) {
    return <div className="place-sheet__empty">{copy.chooseDevice}</div>;
  }

  return (
    <div className="device-detail-list">
      {selectedDevices.map((device) => (
        <DeviceCard
          key={device.deviceId}
          copy={copy}
          device={device}
          color={deviceColorMap.get(device.deviceId) ?? "#9aa0a6"}
          onFetchCurrentLocation={onFetchCurrentLocation}
          onRename={onRename}
        />
      ))}
    </div>
  );
}
