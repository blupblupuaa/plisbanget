# ⚡ Quick Start Guide

Panduan cepat untuk setup dan deploy dalam 15 menit.

---

## 📋 Pre-Deployment Checklist

### ✅ 1. Neon Database Setup

```bash
□ Buat account di https://neon.tech
□ Create new project "hydroponic-monitoring"
□ Copy connection string
□ Test connection dengan psql (optional)
```

### ✅ 2. Local Setup

```bash
# Clone & install
git clone <your-repo>
cd hydroponic-monitoring
npm install

# Setup environment
cp .env.example .env
# Edit .env dengan kredensial Anda

# Push database schema
npm run db:push

# (Optional) Seed sample data
npm run seed

# Test locally
npm run dev
```

### ✅ 3. GitHub Setup

```bash
# Push ke GitHub
git add .
git commit -m "Ready for deployment"
git push origin main
```

### ✅ 4. Vercel Deployment

```bash
□ Login ke vercel.com
□ Import GitHub repository
□ Set environment variables (8 variables)
□ Deploy!
□ Test production URL
```

---

## 🚀 Commands Cheat Sheet

### Development

```bash
npm run dev              # Start dev server → localhost:5000
npm run check            # Type checking
```

### Database

```bash
npm run db:push          # Apply schema to database
npm run db:studio        # Open Drizzle Studio UI
npm run seed             # Seed sample data
```

### Build & Deploy

```bash
npm run build            # Build for production
npm run vercel-build     # Vercel build command
vercel --prod            # Manual deploy (if using CLI)
```

---

## 🔑 Environment Variables (Copy-Paste Ready)

```env
# Antares IoT
ANTARES_API_KEY=104364b8325b5796:f7e668e8b2fb4380
ANTARES_APPLICATION_ID=DRTPM-Hidroponik
ANTARES_BASE_URL=https://platform.antares.id:8443
ANTARES_DEVICE_ID=Monitoring_Hidroponik

# Neon Database (GANTI dengan punya Anda!)
DATABASE_URL=postgresql://username:password@ep-xxx.aws.neon.tech/neondb?sslmode=require

# Cron Secret (generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
CRON_SECRET=your_generated_secret_here

# App Config
NODE_ENV=production
```

---

## 🧪 Testing Checklist

### Local Testing

```bash
# 1. API Endpoints
curl http://localhost:5000/api/system-status
curl http://localhost:5000/api/sensor-readings
curl -X POST http://localhost:5000/api/sync-antares

# 2. Frontend
# Buka http://localhost:5000
□ Dashboard loads
□ Charts render
□ Sync button works
□ Export button works
```

### Production Testing

```bash
# Replace YOUR_APP with actual Vercel URL

# 1. API Health Check
curl https://YOUR_APP.vercel.app/api/system-status

# 2. Manual Sync
curl -X POST https://YOUR_APP.vercel.app/api/sync-antares

# 3. Check Cron
# Vercel Dashboard → Cron Jobs → Check last run
```

---

## 🐛 Common Issues & Fixes

### 1. "DATABASE_URL must be set"

```bash
# Check environment variables
# Vercel: Dashboard → Settings → Environment Variables
# Local: Check .env file exists and has DATABASE_URL
```

### 2. "Failed to connect to database"

```bash
# Verify connection string format:
# postgresql://USER:PASS@HOST.region.aws.neon.tech/DB?sslmode=require
#                                                         ^^^^^^^^^ Important!

# Test with psql:
psql "YOUR_DATABASE_URL"
```

### 3. Build fails on Vercel

```bash
# Check build logs: Vercel Dashboard → Deployment → Build Logs
# Common causes:
# - Missing environment variables
# - TypeScript errors
# - Database connection in build step

# Fix: Ensure vercel-build script runs db:push first
```

### 4. Cron not running

```bash
# Cron only works on production!
# Check: Vercel Dashboard → Cron Jobs
# Verify CRON_SECRET is set
```

### 5. No data showing on dashboard

```bash
# 1. Click "Sync Data" button manually
# 2. Check Antares credentials
# 3. Verify device is sending data:
#    https://platform.antares.id → Your App → Your Device
# 4. Check API response:
#    DevTools → Network → /api/sensor-readings
```

---

## 📊 Database Management

### View Data (Drizzle Studio)

```bash
npm run db:studio
# Opens https://local.drizzle.studio
```

### Reset Database

```bash
# Drop all tables (Neon Dashboard → SQL Editor)
DROP TABLE sensor_readings CASCADE;
DROP TABLE system_status CASCADE;
DROP TABLE alert_settings CASCADE;

# Re-apply schema
npm run db:push

# Seed sample data
npm run seed
```

### Backup Database

```bash
# Export from Neon Dashboard
# Or use pg_dump:
pg_dump "YOUR_DATABASE_URL" > backup.sql

# Restore:
psql "YOUR_DATABASE_URL" < backup.sql
```

---

## 🔄 Update Workflow

### Update Code

```bash
# 1. Make changes locally
git add .
git commit -m "Update: description"
git push

# 2. Vercel auto-deploys!
# 3. Check deployment status: vercel.com dashboard
```

### Update Database Schema

```bash
# 1. Edit server/schema.ts
# 2. Generate migration
npm run db:generate

# 3. Apply to database
npm run db:push

# 4. Deploy (Vercel will run db:push automatically)
git push
```

---

## 📞 Quick Links

- 🌐 **Vercel Dashboard**: https://vercel.com/dashboard
- 🗄️ **Neon Dashboard**: https://console.neon.tech
- 🔌 **Antares Dashboard**: https://platform.antares.id
- 📚 **Full Docs**: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## ⏱️ Deployment Timeline

```
Total time: ~15 minutes

1. Neon Setup         → 3 min
2. Local Setup        → 5 min
3. GitHub Push        → 2 min
4. Vercel Deployment  → 5 min
```

---

## 🎯 Success Criteria

Deployment berhasil jika:

- ✅ Website accessible di https://YOUR_APP.vercel.app
- ✅ Dashboard menampilkan data
- ✅ Charts rendering dengan baik
- ✅ Sync button berfungsi
- ✅ No console errors
- ✅ Cron job terjadwal (check Vercel Dashboard)

---

Selamat! Anda siap deploy! 🚀

Jika stuck, lihat [Troubleshooting](./DEPLOYMENT.md#-troubleshooting) atau open issue.
