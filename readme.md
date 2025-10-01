# 🌱 Hydroponic Monitoring System

Real-time monitoring system untuk sistem hidroponik dengan integrasi Antares IoT Platform. Dibangun dengan React, TypeScript, Express, dan PostgreSQL.

![Dashboard Preview](https://img.shields.io/badge/Status-Production-success)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)
![Database](https://img.shields.io/badge/Database-Neon%20PostgreSQL-blue)

---

## ✨ Features

- 📊 **Real-time Monitoring**: Temperature, pH Level, dan TDS Level
- 📈 **Data Visualization**: Interactive charts dengan time range selector (24H, 7D, 30D)
- 🔄 **Auto Sync**: Automatic data synchronization setiap 10 menit
- 📥 **Data Export**: Export data ke CSV/JSON format
- 🔔 **Alert System**: Configurable alerts untuk abnormal readings
- 🌐 **IoT Integration**: Seamless integration dengan Antares IoT Platform
- 💾 **Persistent Storage**: PostgreSQL database via Neon
- ⚡ **Serverless**: Deployed on Vercel with serverless functions

---

## 🏗️ Tech Stack

### Frontend

- **React 18** - UI Framework
- **TypeScript** - Type Safety
- **Vite** - Build Tool
- **TailwindCSS** - Styling
- **shadcn/ui** - UI Components
- **Recharts** - Data Visualization
- **TanStack Query** - State Management

### Backend

- **Node.js** - Runtime
- **Express** - API Framework (dev only)
- **Vercel Serverless Functions** - Production API
- **Drizzle ORM** - Database ORM
- **Zod** - Schema Validation

### Database

- **Neon PostgreSQL** - Serverless Postgres
- **Drizzle Kit** - Migration Tool

### IoT Platform

- **Antares IoT** - Sensor Data Source

---

## 🚀 Quick Start

### Prerequisites

```bash
- Node.js 18+
- npm atau yarn
- Neon account (free tier)
- Vercel account (free tier)
- Antares IoT account
```

### 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/hydroponic-monitoring.git
cd hydroponic-monitoring
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Edit .env dengan kredensial Anda
nano .env
```

Required variables:

```env
ANTARES_API_KEY=your_api_key
ANTARES_APPLICATION_ID=your_app_id
ANTARES_DEVICE_ID=your_device_id
DATABASE_URL=postgresql://...
CRON_SECRET=your_secret
```

### 4. Setup Database

```bash
# Push schema ke database
npm run db:push

# (Optional) Open Drizzle Studio untuk manage database
npm run db:studio
```

### 5. Run Development Server

```bash
npm run dev
```

Buka http://localhost:5000 🎉

---

## 📦 Deployment

Lihat [DEPLOYMENT.md](./DEPLOYMENT.md) untuk panduan lengkap deployment ke Vercel + Neon.

### Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/hydroponic-monitoring)

**Jangan lupa set environment variables di Vercel Dashboard!**

---

## 📂 Project Structure

```
hydroponic-monitoring/
├── api/                          # Vercel Serverless Functions
│   ├── sensor-readings.ts        # GET/POST sensor data
│   ├── sensor-readings/
│   │   ├── latest.ts            # Get latest reading
│   │   └── range.ts             # Get readings by time range
│   ├── sync-antares.ts          # Manual sync from Antares
│   ├── system-status.ts         # System health status
│   ├── alert-settings.ts        # Alert configuration
│   ├── export-data.ts           # Export data to CSV/JSON
│   └── cron/
│       └── sync-antares.ts      # Auto-sync cron job
├── client/                       # React Frontend
│   ├── src/
│   │   ├── components/          # UI Components
│   │   ├── pages/               # Page Components
│   │   ├── lib/                 # Utilities & API Client
│   │   └── hooks/               # Custom React Hooks
│   └── index.html
├── server/                       # Backend Code (dev only)
│   ├── db.ts                    # Database connection
│   ├── schema.ts                # Drizzle schema
│   ├── services/
│   │   └── antares.ts           # Antares API client
│   └── index.ts                 # Express server (dev)
├── shared/                       # Shared Types
│   └── schema.ts                # Zod schemas & types
├── vercel.json                   # Vercel configuration
├── drizzle.config.ts            # Database config
└── package.json
```

---

## 🔌 API Endpoints

### Sensor Readings

```bash
# Get all readings (with limit)
GET /api/sensor-readings?limit=50

# Get latest reading
GET /api/sensor-readings/latest

# Get readings by time range
GET /api/sensor-readings/range?startTime=2024-01-01&endTime=2024-01-31

# Create new reading (manual)
POST /api/sensor-readings
Body: { temperature: 30, ph: 7.0, tdsLevel: 500 }
```

### Sync & Export

```bash
# Manual sync from Antares
POST /api/sync-antares

# Export data
GET /api/export-data?format=csv
GET /api/export-data?format=json&startTime=...&endTime=...
```

### System

```bash
# Get system status
GET /api/system-status

# Get alert settings
GET /api/alert-settings

# Update alert settings
PUT /api/alert-settings
Body: { temperatureAlerts: true, phAlerts: true, tdsLevelAlerts: false }
```

### Cron (Internal)

```bash
# Auto-sync (called by Vercel Cron every 10 min)
POST /api/cron/sync-antares
Header: Authorization: Bearer YOUR_CRON_SECRET
```

---

## 🗄️ Database Schema

### sensor_readings

```sql
CREATE TABLE sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  temperature REAL NOT NULL,
  ph REAL NOT NULL,
  tds_level REAL NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### system_status

```sql
CREATE TABLE system_status (
  id TEXT PRIMARY KEY,
  connection_status TEXT NOT NULL, -- 'connected', 'disconnected', 'error'
  last_update TIMESTAMP NOT NULL,
  data_points INTEGER NOT NULL DEFAULT 0,
  cpu_usage INTEGER NOT NULL DEFAULT 0,
  memory_usage INTEGER NOT NULL DEFAULT 0,
  storage_usage INTEGER NOT NULL DEFAULT 0,
  uptime TEXT NOT NULL DEFAULT '0d 0h 0m'
);
```

### alert_settings

```sql
CREATE TABLE alert_settings (
  id TEXT PRIMARY KEY,
  temperature_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  ph_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  tds_level_alerts BOOLEAN NOT NULL DEFAULT FALSE
);
```

---

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server (frontend + backend)

# Build
npm run build            # Build for production
npm run check            # Type checking

# Database
npm run db:generate      # Generate migration files
npm run db:push          # Push schema to database
npm run db:studio        # Open Drizzle Studio

# Vercel
npm run vercel-build     # Build command for Vercel
```

### Environment Variables

#### Required

- `DATABASE_URL` - Neon PostgreSQL connection string
- `ANTARES_API_KEY` - Antares API key
- `ANTARES_APPLICATION_ID` - Antares application ID
- `ANTARES_DEVICE_ID` - Antares device ID

#### Optional

- `ANTARES_BASE_URL` - Antares base URL (default: https://platform.antares.id:8443)
- `CRON_SECRET` - Secret for Vercel Cron authentication
- `NODE_ENV` - Environment mode (development/production)
- `PORT` - Server port (default: 5000, dev only)

---

## 📊 Monitoring Sensors

### Optimal Ranges

- **Temperature**: 28-32°C
- **pH Level**: 6.5-7.5
- **TDS Level**: 400-600 ppm

### Status Indicators

- 🟢 **Optimal**: Value dalam range ideal
- 🔵 **Low**: Value di bawah range
- 🟡 **High**: Value di atas range

---

## 🐛 Troubleshooting

### Database Connection Error

```bash
# Verify DATABASE_URL format
echo $DATABASE_URL

# Should look like:
# postgresql://user:pass@host.region.aws.neon.tech/db?sslmode=require

# Test connection
npm run db:push
```

### Antares API Error

```bash
# Verify credentials in .env
# Check Antares dashboard: https://platform.antares.id

# Test endpoint manually
curl -H "X-M2M-Origin: YOUR_API_KEY" \
  https://platform.antares.id:8443/~/antares-cse/antares-id/YOUR_APP/YOUR_DEVICE/la
```

### Build Error on Vercel

```bash
# Check build logs in Vercel Dashboard
# Verify all environment variables are set
# Ensure DATABASE_URL is accessible from Vercel
```

### Cron Job Not Running

```bash
# Verify CRON_SECRET is set in Vercel
# Check Vercel Dashboard → Cron Jobs
# Cron only runs on production deployments
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

- **Your Name** - Initial work

---

## 🙏 Acknowledgments

- [Antares IoT Platform](https://platform.antares.id) - IoT data provider
- [Neon](https://neon.tech) - Serverless PostgreSQL
- [Vercel](https://vercel.com) - Hosting platform
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [Drizzle ORM](https://orm.drizzle.team) - Database ORM

---

## 📞 Support

Untuk pertanyaan dan support:

- 📧 Email: your.email@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/YOUR_USERNAME/hydroponic-monitoring/issues)
- 📚 Documentation: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

Made with ❤️ for hydroponic farmers 🌱
