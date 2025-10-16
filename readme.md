# 🌱 Hydroponic Monitoring System

Real-time monitoring dashboard untuk sistem hidroponik dengan integrasi Antares IoT.

**Live Demo**: [https://your-app.vercel.app](https://your-app.vercel.app)

---

## ✨ Features

- 📊 Real-time sensor monitoring (Temperature, pH, TDS)
- 📈 Interactive charts dengan time range selector
- 🔄 Auto-sync setiap 10 menit via Vercel Cron
- 📥 Export data (CSV/JSON)
- ⚡ Serverless deployment (Vercel + Neon PostgreSQL)

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <repo-url>
cd hydroponic-monitoring
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Antares IoT
ANTARES_API_KEY=your_key
ANTARES_APPLICATION_ID=your_app
ANTARES_DEVICE_ID=your_device

# Neon Database (get from neon.tech)
DATABASE_URL=postgresql://user:pass@host.neon.tech/db?sslmode=require

# Cron Secret (generate: openssl rand -hex 32)
CRON_SECRET=your_random_secret
```

### 3. Setup Database

```bash
npm run db:push
```

### 4. Run Locally

```bash
npm run dev
```

Open http://localhost:5000 🎉

---

## 📦 Deployment ke Vercel

### Option 1: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/hydroponic-monitoring)

### Option 2: Manual Deploy

1. Push code ke GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. Import di Vercel

- Buka [vercel.com](https://vercel.com)
- Import repository
- Add environment variables (dari `.env`)
- Deploy!

3. Setup Database

Neon PostgreSQL akan auto-apply schema saat build.

---

## 🔧 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: Vercel Serverless Functions
- **Database**: Neon PostgreSQL (serverless)
- **ORM**: Drizzle ORM
- **IoT**: Antares Platform
- **Charts**: Recharts
- **UI**: shadcn/ui

---

## 📁 Project Structure

```
hydroponic-monitoring/
├── api/
│   └── index.ts              # Single API handler (all endpoints)
├── client/
│   └── src/
│       ├── components/       # UI components
│       ├── pages/            # Dashboard page
│       └── lib/              # Utilities
├── shared/
│   └── schema.ts             # Type definitions
├── .env.example              # Environment template
├── drizzle.config.ts         # Database config
├── package.json              # Dependencies
├── README.md                 # This file
├── vercel.json               # Vercel configuration
└── vite.config.ts            # Vite configuration
```

---

## 🔌 API Endpoints

### Sensor Readings

```bash
# Get all readings (limit: 50)
GET /api/sensor-readings?limit=50

# Get latest reading
GET /api/sensor-readings/latest

# Get by time range
GET /api/sensor-readings/range?startTime=2024-01-01&endTime=2024-01-31

# Manual insert
POST /api/sensor-readings
Body: { temperature: 30, ph: 7.0, tdsLevel: 500 }
```

### Sync & Export

```bash
# Manual sync from Antares
POST /api/sync-antares

# Export data (CSV)
GET /api/export-data?format=csv

# Export data (JSON)
GET /api/export-data?format=json&startTime=...&endTime=...
```

### System

```bash
# Get system status
GET /api/system-status
```

### Cron (Internal)

```bash
# Auto-sync (called by Vercel Cron every 10 min)
POST /api/cron/sync-antares
Header: Authorization: Bearer YOUR_CRON_SECRET
```

---

## 🗄️ Database Schema

```sql
-- Sensor readings
CREATE TABLE sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TEXT NOT NULL,
  temperature REAL NOT NULL,
  ph REAL NOT NULL,
  tds_level REAL NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- System status
CREATE TABLE system_status (
  id TEXT PRIMARY KEY,
  connection_status TEXT NOT NULL,
  last_update TEXT NOT NULL,
  data_points REAL DEFAULT 0
);
```

---

## 🔄 Auto-Sync Setup

Vercel Cron sudah dikonfigurasi di `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/sync-antares",
    "schedule": "*/10 * * * *"
  }]
}
```

**Verify:**
- Vercel Dashboard → Project → Cron Jobs
- Check logs & last execution

---

## 🐛 Troubleshooting

### Database Connection Error

```bash
# Verify DATABASE_URL format
echo $DATABASE_URL
# Should include: ?sslmode=require

# Test connection
npm run db:push
```

### Antares API Error

```bash
# Check credentials in .env
# Verify device is sending data at platform.antares.id
```

### Build Error

```bash
# Check Vercel logs
# Ensure all environment variables are set
# Verify DATABASE_URL is accessible from Vercel
```

### Cron Not Running

```bash
# Verify CRON_SECRET is set in Vercel
# Check Vercel Dashboard → Cron Jobs
# Cron only works on production!
```

---

## 📊 Monitoring

### Optimal Sensor Ranges

- **Temperature**: 28-32°C
- **pH Level**: 6.5-7.5
- **TDS Level**: 400-600 ppm

### Status Indicators

- 🟢 **Optimal**: Within ideal range
- 🔵 **Low**: Below range
- 🟡 **High**: Above range

---

## 🛠️ Development

```bash
# Development server
npm run dev

# Type checking
npm run check

# Build for production
npm run build

# Database commands
npm run db:generate     # Generate migrations
npm run db:push         # Apply schema
npm run db:studio       # Open Drizzle Studio
```

---

## 📄 License

MIT License - see LICENSE file

---

## 🙏 Credits

- [Antares IoT](https://platform.antares.id) - IoT platform
- [Neon](https://neon.tech) - Serverless PostgreSQL
- [Vercel](https://vercel.com) - Hosting
- [Drizzle ORM](https://orm.drizzle.team) - Database ORM
- [shadcn/ui](https://ui.shadcn.com) - UI components

---

**Made with ❤️ for hydroponic farmers** 🌱