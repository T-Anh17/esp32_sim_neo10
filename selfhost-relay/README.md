# Self-Host Relay

Relay Node.js toi gian cho SIM:

- `GET /api/ping`
- `GET /api/geolocate`
- `POST /update`
- `GET /update_get`
- `GET /api/location`

Chay local:

```bash
cd selfhost-relay
node server.mjs
```

Hoac:

```bash
cd selfhost-relay
npm start
```

Bien moi truong:

- `PORT`: cong HTTP, mac dinh `8787`
- `RELAY_STORE_PATH`: file JSON de luu snapshot, mac dinh `./data/relay-store.json`
- `HISTORY_LIMIT`: so diem lich su toi da moi thiet bi, mac dinh `500`

Firmware nen tro den cac URL:

- `SIM Tracking URL`: `https://your-host/update`
- `SIM Netloc Relay URL`: `https://your-host/api/geolocate`

Luu y:

- Dich vu nay dung TLS/phia reverse proxy cua host ban. Dat sau Nginx/Caddy hoac mot host Node co HTTPS de modem SIM bat tay de hon Cloudflare `workers.dev`.
- De deploy tu Git, dung bat ky host Node nao cho phep chay `npm start` tren thu muc `selfhost-relay`.
