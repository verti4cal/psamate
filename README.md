# PSAmate

A self-hosted tracker for your PSA/Stellantis vehicle — Peugeot, Citroën, DS, Opel, or Vauxhall. Inspired by [TeslaMate](https://github.com/teslamate-org/teslamate), PSAmate polls the official Connected Car service used by your brand's mobile app and gives you a private dashboard with live status, trip history, charging sessions, and statistics — all stored locally, with no data sent to third parties.

## Features

- **Live dashboard** — battery level, range, mileage, location on a map, and lock status
- **Automatic trip logging** — drives are detected and recorded with route, distance, and duration
- **Charging history** — every charge session with energy added, cost, and start/end battery level
- **Statistics** — weekly/monthly/yearly summaries of distance, energy use, and charging cost
- **Home Assistant integration** — publishes all vehicle data to MQTT with auto-discovery, so entities appear in Home Assistant automatically
- **Multi-vehicle support** — connect more than one car, even across different brands or multiple accounts of the same brand
- **Runs entirely on your own hardware** — a Raspberry Pi, NAS, home server, or small VPS is enough

> **Note:** Remote commands (lock, climate control, etc.) are not currently supported. PSA does not expose these over the same API used for status polling.

## Requirements

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- A PSA/Stellantis brand account (the same login you use in the Peugeot/Citroën/DS/Opel/Vauxhall mobile app) with at least one vehicle registered to it

## Getting started

1. **Download the project**

   ```bash
   git clone <repository-url> psamate
   cd psamate
   ```

2. **Start the app**

   ```bash
   docker compose up --build -d
   ```

   This builds a single container with the API, poller, and web UI, and exposes it on port 80. Your data is stored in a Docker volume, so it survives restarts and upgrades.

3. **Open the app**

   Visit `http://localhost` (or your server's address) in a browser. You'll land on the setup wizard.

4. **Connect your vehicle**

   - Choose your brand and country
   - Click **Open login page** and sign in with your brand account credentials — the same ones from the mobile app
   - After logging in, your browser will try to open a link that starts with something like `mymap://...` — this will show as a failed page load. That's expected.
   - Open your browser's developer tools (`F12`), go to the **Network** tab, find that failed request, and copy the `code` value from its URL
   - Paste the code back into PSAmate and click **Connect**

   PSAmate will then fetch your vehicle(s) and start tracking automatically.

5. **Add more vehicles (optional)**

   From the sidebar, click **Add vehicle** to connect another car — either a different account of the same brand, or a vehicle from a different brand entirely.

## Connecting to Home Assistant

1. In PSAmate, go to **Settings**
2. Enable MQTT and enter your broker's host, port, and (if required) credentials
3. Click **Test connection** to confirm it works
4. Save — PSAmate will publish Home Assistant MQTT Discovery messages, and your vehicle(s) will appear automatically under **Settings → Devices & Services → MQTT** in Home Assistant, with sensors for battery, range, location, charging status, temperature, and more

## Updating

```bash
git pull
docker compose up --build -d
```

Your data is preserved across updates.

## Reconnecting after a login expires

If PSA/Stellantis invalidates your login token, PSAmate will pause tracking for that vehicle and show a **Reconnect** banner on the dashboard. Click it and repeat the login steps above to resume tracking — no data is lost.

## Backing up your data

All data lives in the `data` Docker volume as a single SQLite database file. To back it up:

```bash
docker compose stop psamate
docker run --rm -v psamate_data:/data -v "$(pwd)":/backup alpine cp /data/psamate.db /backup/psamate-backup.db
docker compose start psamate
```

## Privacy

PSAmate runs entirely on infrastructure you control. Your vehicle credentials and location history never leave your server except to communicate directly with the official PSA/Stellantis API.

## Support

This is an independent, community project and is not affiliated with, endorsed by, or supported by Stellantis, Peugeot, Citroën, DS, Opel, or Vauxhall.
