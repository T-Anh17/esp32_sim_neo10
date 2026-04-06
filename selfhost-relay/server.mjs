import http from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const STORE_PATH = process.env.RELAY_STORE_PATH ||
  path.join(__dirname, "data", "relay-store.json");
const HISTORY_LIMIT = Math.max(1, Number(process.env.HISTORY_LIMIT || 500));

let store = {
  devices: {},
  history: {},
};

function normalizeNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
}

function normalizeString(value, fallback = "") {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return fallback;
}

function normalizeDeviceId(value) {
  const base = normalizeString(value);
  if (!base) return null;
  const normalized = base.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48);
  return normalized || null;
}

function normalizeDeviceName(value, fallback) {
  return normalizeString(value, fallback).slice(0, 64);
}

function isValidCoordPair(lat, lng) {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

async function loadStore() {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      store = {
        devices: parsed.devices && typeof parsed.devices === "object"
          ? parsed.devices
          : {},
        history: parsed.history && typeof parsed.history === "object"
          ? parsed.history
          : {},
      };
    }
  } catch {
    await mkdir(path.dirname(STORE_PATH), { recursive: true });
    await saveStore();
  }
}

let savePromise = Promise.resolve();
function saveStore() {
  savePromise = savePromise.then(async () => {
    await mkdir(path.dirname(STORE_PATH), { recursive: true });
    await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  });
  return savePromise;
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function parseWifiQuery(value) {
  const raw = normalizeString(value);
  if (!raw) return [];
  return raw
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [bssidRaw, rssiRaw, chRaw] = item.split("|");
      const hex = normalizeString(bssidRaw)
        .replace(/[^a-fA-F0-9]/g, "")
        .toUpperCase();
      if (hex.length !== 12) return null;
      const bssid = hex.match(/.{1,2}/g).join(":");
      const rssi = normalizeNumber(rssiRaw);
      const channel = normalizeNumber(chRaw);
      if (rssi === null || channel === null) return null;
      return { bssid, rssi, channel };
    })
    .filter(Boolean);
}

async function geolocateFromQuery(url) {
  const provider = normalizeString(
    url.searchParams.get("provider"),
    "unwiredlabs",
  ).toLowerCase();
  const apiKey = normalizeString(url.searchParams.get("key"));
  const radio = normalizeString(url.searchParams.get("radio"), "lte");
  const mcc = normalizeNumber(url.searchParams.get("mcc"));
  const mnc = normalizeNumber(url.searchParams.get("mnc"));
  const lac = normalizeNumber(url.searchParams.get("lac"));
  const cid = normalizeNumber(url.searchParams.get("cid"));
  const dbm = normalizeNumber(url.searchParams.get("dbm")) ?? -113;
  const wifi = parseWifiQuery(url.searchParams.get("wifi"));

  if (!apiKey || mcc === null || mnc === null || lac === null || cid === null) {
    return { status: 400, body: { error: "Missing geolocation params" } };
  }

  let upstreamUrl = "";
  let payload;
  if (provider === "google") {
    upstreamUrl = `https://www.googleapis.com/geolocation/v1/geolocate?key=${encodeURIComponent(apiKey)}`;
    payload = {
      radioType: radio,
      considerIp: true,
      cellTowers: [
        {
          mobileCountryCode: mcc,
          mobileNetworkCode: mnc,
          locationAreaCode: lac,
          cellId: cid,
          signalStrength: dbm,
        },
      ],
      wifiAccessPoints: wifi.map((ap) => ({
        macAddress: ap.bssid,
        signalStrength: ap.rssi,
        channel: ap.channel,
      })),
    };
  } else {
    upstreamUrl = "https://us1.unwiredlabs.com/v2/process.php";
    payload = {
      token: apiKey,
      radio,
      mcc,
      mnc,
      cells: [{ lac, cid }],
      wifi: wifi.map((ap) => ({
        bssid: ap.bssid,
        signal: ap.rssi,
        channel: ap.channel,
      })),
      address: 1,
    };
  }

  const upstream = await fetch(upstreamUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await upstream.text();
  let parsed = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }

  if (!upstream.ok) {
    return {
      status: upstream.status,
      body: {
        error: "Upstream geolocation failed",
        provider,
        upstreamStatus: upstream.status,
        upstreamBody: parsed,
      },
    };
  }

  const location =
    parsed.location && typeof parsed.location === "object" ? parsed.location : parsed;
  const lat = normalizeNumber(location.lat);
  const lng = normalizeNumber(location.lng ?? location.lon);
  const accuracy =
    normalizeNumber(parsed.accuracy ?? location.accuracy) ?? 9999;

  if (!isValidCoordPair(lat, lng)) {
    return {
      status: 502,
      body: {
        error: "Invalid upstream location",
        provider,
        upstreamBody: parsed,
      },
    };
  }

  return {
    status: 200,
    body: { ok: true, lat, lng, accuracy, provider },
  };
}

function buildSnapshot(deviceId, input) {
  const lat = normalizeNumber(input.lat);
  const lng = normalizeNumber(input.lng);
  if (!deviceId || lat === null || lng === null || !isValidCoordPair(lat, lng)) {
    return null;
  }

  return {
    id: deviceId,
    deviceId,
    deviceName: normalizeDeviceName(input.deviceName ?? input.name, deviceId),
    lat,
    lng,
    timestamp: Date.now(),
    locSource: normalizeString(input.locSource, "unknown"),
    locAccuracyM: normalizeNumber(input.locAccuracyM) ?? -1,
    locAgeMs: normalizeNumber(input.locAgeMs) ?? -1,
    satellites: normalizeNumber(input.satellites) ?? 0,
    speedKmph: normalizeNumber(input.speedKmph) ?? 0,
    historySample: normalizeBoolean(input.historySample, false),
  };
}

async function handleUpdate(req, res, input) {
  const deviceId = normalizeDeviceId(input.deviceId ?? input.id);
  const snapshot = buildSnapshot(deviceId, input);
  if (!snapshot) {
    json(res, 400, { error: "Missing or invalid deviceId, lat or lng" });
    return;
  }

  store.devices[deviceId] = snapshot;
  if (snapshot.historySample) {
    const history = store.history[deviceId] || [];
    history.push(snapshot);
    store.history[deviceId] = history.slice(-HISTORY_LIMIT);
  }
  await saveStore();

  json(res, 200, {
    ok: true,
    deviceId,
    historySample: snapshot.historySample,
    timestamp: snapshot.timestamp,
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/ping") {
      json(res, 200, {
        ok: true,
        pong: true,
        ts: Date.now(),
        host: url.hostname,
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/geolocate") {
      const result = await geolocateFromQuery(url);
      json(res, result.status, result.body);
      return;
    }

    if (req.method === "GET" && url.pathname === "/update_get") {
      await handleUpdate(req, res, Object.fromEntries(url.searchParams.entries()));
      return;
    }

    if (req.method === "POST" && url.pathname === "/update") {
      const input = await readJsonBody(req);
      await handleUpdate(req, res, input);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/location") {
      const deviceId = normalizeDeviceId(
        url.searchParams.get("deviceId") || url.searchParams.get("id"),
      );
      if (!deviceId || !store.devices[deviceId]) {
        json(res, 404, { error: "Device not found" });
        return;
      }
      json(res, 200, store.devices[deviceId]);
      return;
    }

    json(res, 404, { error: "Not found" });
  } catch (error) {
    json(res, 500, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

await loadStore();
server.listen(PORT, () => {
  console.log(`[relay] listening on :${PORT}`);
  console.log(`[relay] store=${STORE_PATH}`);
});
