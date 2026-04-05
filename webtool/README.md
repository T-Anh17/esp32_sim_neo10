# webtool

Frontend React + TypeScript de hien thi vi tri hien tai va lich su di chuyen cua cac thiet bi `esp32_sim_neo10`.
Bo nay dung Webpack, khong dung Vite.

## Chay local

1. `npm install`
2. `npm run dev`
3. Neu can doi API, tao `.env`:
   - `TRACKER_API_BASE=https://your-worker-domain.example.com`

## API dang su dung

- `GET /api/devices`
- `GET /api/location?deviceId=...`
- `GET /api/history?deviceId=...&from=...&to=...&limit=...`
- `POST /api/device/rename`

## Ghi chu

- Frontend su dung `react-leaflet` va OpenStreetMap tiles.
- Worker luu lich su theo key `HISTORY:<deviceId>:<timestamp>`.
