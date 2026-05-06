# cipher — setup & deployment

This project uses a **custom Node HTTP server** (`server.ts`) that serves the Next.js App Router app **and** hosts Socket.IO on the **same port**. By default that port is **3000**, matching `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SOCKET_URL`.

## Local development

```bash
git clone <repo>
cd secure-chat
npm install

cp .env.local.example .env.local
# Fill in MONGODB_URI and REDIS_URL for full API functionality.
# For a quick UI-only spin-up, you can leave them blank — room metadata endpoints will degrade gracefully.

docker run -p 6379:6379 redis:alpine

npm run dev
# Open http://localhost:3000
```

> **Note:** Use `npm run dev` (not `next dev`) so Socket.IO attaches to the same server that serves the web UI.

## MongoDB & Redis roles

- **MongoDB** stores **only room metadata** (`Room` documents). Message bodies are **never** written to MongoDB.
- **Redis** stores short-lived ciphertext blobs for encrypted uploads (`/api/upload`). If `REDIS_URL` is unset, uploads fall back to an in-memory map (development only).

### Atlas DNS / `querySrv ECONNREFUSED`

If the server logs **`querySrv ECONNREFUSED`** for `_mongodb._tcp…`, your PC cannot resolve MongoDB Atlas **SRV** records (common with some ISP/corporate DNS, VPNs, or antivirus).

1. Add **`MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1`** to `.env.local` (this project applies it via Node’s `dns.setServers`) and restart **`npm run dev`**.
2. Or in **Atlas → Connect**, choose the **standard connection string** (`mongodb://host1:27017,host2:27017/…`) instead of **`mongodb+srv://`**, and put that full URI in **`MONGODB_URI`**.
3. Or change Windows **DNS** to **8.8.8.8** / **1.1.1.1** in your network adapter settings.

## WebRTC / TURN

- STUN servers can be public (`NEXT_PUBLIC_STUN_SERVERS`).
- **Do not** ship long-lived TURN username/password pairs to browsers. Prefer providers that issue **short-lived credentials** (often minted by your backend).
- This repo includes optional `NEXT_PUBLIC_TURN_*` placeholders for providers that safely expose ephemeral credentials to clients.

## Production deployment

Because this app relies on a **long-lived Node process** with Socket.IO, it does **not** map cleanly to pure serverless platforms.

Recommended split:

- **Frontend static export is not used here** — keep Next in Node mode on your platform.
- Deploy the **custom server** (`npm run start`) to **Railway**, **Render**, **Fly.io**, or a **VPS**.
- Use **MongoDB Atlas** for metadata.
- Use **Redis Cloud / Upstash** for encrypted upload blobs & session helpers.

Example production environment:

```env
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...
NEXT_PUBLIC_SOCKET_URL=https://your-api.example.com
NEXT_PUBLIC_APP_URL=https://your-api.example.com
ROOM_INACTIVITY_TIMEOUT_MS=60000
MAX_FILE_SIZE_MB=25
MAX_PARTICIPANTS_PER_ROOM=10
```

## Security checklist (operator)

- Keep rate limits (`express-rate-limit` on `/api/rooms`) tuned for your threat model.
- Rotate database credentials and Redis ACLs regularly.
- Prefer HTTPS/WSS everywhere; set cookies/session flags appropriately if you add auth later.
