# 🚀 Deployment Guide - Vercel + Neon Database

Panduan lengkap deploy Hydroponic Monitoring System ke Vercel dengan Neon PostgreSQL.

---

## 📋 Prerequisites

- ✅ GitHub account
- ✅ Vercel account (gratis)
- ✅ Neon account (gratis)
- ✅ Akses ke Antares IoT platform

---

## 🗄️ STEP 1: Setup Neon Database

### 1.1 Buat Project Baru

1. Buka https://console.neon.tech
2. Klik **"Create a project"**
3. Isi form:
   - **Project name**: `hydroponic-monitoring`
   - **Database name**: `neondb` (default)
   - **Region**: **Singapore** (terdekat ke Indonesia)
   - **Postgres version**: 16 (latest)
4. Klik **"Create project"**

### 1.2 Copy Connection String

Setelah project dibuat, copy **Connection String**:

```
postgresql://username:password@ep-xxx-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

**SIMPAN INI!** Kita butuh untuk environment variables.

### 1.3 Test Connection (Optional)

```bash
# Install psql jika belum ada
# MacOS: brew install postgresql
# Ubuntu: sudo apt install postgresql-client

# Test koneksi
psql "postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
```

---

## 📦 STEP 2: Persiapan Project

### 2.1 Update File `.env`

Buat file `.env` di root project:

```bash
cp .env.example .env
```

Edit `.env` dengan kredensial Anda:

```env
# Antares IoT (sudah ada)
ANTARES_API_KEY=104364b8325b5796:f7e668e8b2fb4380
ANTARES_APPLICATION_ID=DRTPM-Hidroponik
ANTARES_BASE_URL=https://platform.antares.id:8443
ANTARES_DEVICE_ID=Monitoring_Hidroponik

# Neon Database (PASTE connection string dari Neon)
DATABASE_URL=postgresql://username:password@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

# Generate cron secret
CRON_SECRET=generate_random_string_here

# Development
NODE_ENV=development
PORT=5000
```

### 2.2 Generate Cron Secret

```bash
# Generate random secret untuk cron
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy hasilnya ke `CRON_SECRET` di `.env`

### 2.3 Install Dependencies

```bash
npm install
```

### 2.4 Push Database Schema

```bash
# Generate migration
npm run db:generate

# Push schema ke Neon
npm run db:push
```

Output sukses:

```
✓ Pushed schema to database
```

### 2.5 Test Local

```bash
npm run dev
```

Buka http://localhost:5000 - pastikan berjalan dengan baik.

---

## 🐙 STEP 3: Push ke GitHub

### 3.1 Init Git (jika belum)

```bash
git init
git add .
git commit -m "Initial commit - ready for Vercel deployment"
```

### 3.2 Create GitHub Repo

1. Buka https://github.com/new
2. Nama repo: `hydroponic-monitoring`
3. **Jangan** centang "Initialize with README"
4. Klik **"Create repository"**

### 3.3 Push ke GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/hydroponic-monitoring.git
git branch -M main
git push -u origin main
```

Refresh halaman GitHub - kode sudah terupload!

---

## ☁️ STEP 4: Deploy ke Vercel

### 4.1 Import Project

1. Buka https://vercel.com
2. Klik **"Add New..." → "Project"**
3. **Import Git Repository** → pilih `hydroponic-monitoring`
4. Klik **"Import"**

### 4.2 Configure Project

Di halaman konfigurasi:

**Framework Preset**: Vite ✅

**Build & Output Settings**:

- Build Command: `npm run vercel-build`
- Output Directory: `dist/public`
- Install Command: `npm install`

**Root Directory**: `./` (default)

### 4.3 Environment Variables

Klik **"Environment Variables"** dan tambahkan SEMUA dari `.env`:

| Name                     | Value                                             |
| ------------------------ | ------------------------------------------------- |
| `ANTARES_API_KEY`        | `104364b8325b5796:f7e668e8b2fb4380`               |
| `ANTARES_APPLICATION_ID` | `DRTPM-Hidroponik`                                |
| `ANTARES_BASE_URL`       | `https://platform.antares.id:8443`                |
| `ANTARES_DEVICE_ID`      | `Monitoring_Hidroponik`                           |
| `DATABASE_URL`           | `postgresql://...` (paste Neon connection string) |
| `CRON_SECRET`            | `your_generated_secret`                           |
| `NODE_ENV`               | `production`                                      |

**PENTING**: Pastikan `DATABASE_URL` sama persis dengan yang dari Neon!

### 4.4 Deploy!

Klik **"Deploy"** 🚀

Tunggu 2-3 menit...

---

## ✅ STEP 5: Verifikasi Deployment

### 5.1 Check Deployment Status

Setelah deploy selesai, Vercel akan memberikan URL:

```
https://hydroponic-monitoring-xxx.vercel.app
```

### 5.2 Test API Endpoints

```bash
# Test system status
curl https://your-app.vercel.app/api/system-status

# Test sensor readings
curl https://your-app.vercel.app/api/sensor-readings

# Test sync (POST request)
curl -X POST https://your-app.vercel.app/api/sync-antares
```

### 5.3 Test Frontend

Buka `https://your-app.vercel.app` di browser:

- ✅ Dashboard loading
- ✅ Status cards tampil
- ✅ Charts rendering
- ✅ Tombol "Sync Data" berfungsi

---

## 🔄 STEP 6: Setup Vercel Cron (Auto Sync)

Cron jobs sudah dikonfigurasi di `vercel.json`, tapi perlu verifikasi:

### 6.1 Check Cron Settings

1. Buka Vercel Dashboard → Project Settings
2. Klik **"Cron Jobs"**
3. Pastikan ada job:
   - Path: `/api/cron/sync-antares`
   - Schedule: `*/10 * * * *` (every 10 minutes)

### 6.2 Test Cron Manually

```bash
curl -X POST https://your-app.vercel.app/api/cron/sync-antares \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Response sukses:

```json
{
  "success": true,
  "message": "Automatic sync completed",
  "reading": { ... }
}
```

---

## 🎉 DONE! Deployment Berhasil

Website Anda sekarang:

- ✅ Live di Vercel
- ✅ Database persistent di Neon
- ✅ Auto-sync setiap 10 menit
- ✅ HTTPS gratis dari Vercel

**URL Production**: https://your-app.vercel.app

---

## 🔧 Maintenance & Updates

### Update Code

```bash
# Edit code locally
git add .
git commit -m "Update feature X"
git push

# Vercel otomatis deploy! 🎉
```

### Check Logs

Vercel Dashboard → Your Project → "Logs"

### Database Management

```bash
# Open Drizzle Studio (local development)
npm run db:studio

# Access di: https://local.drizzle.studio
```

### Neon Dashboard

- Monitor database: https://console.neon.tech
- Free tier: 10 projects, 0.5 GB storage
- Auto-suspend after inactivity (hemat resource)

---

## 🐛 Troubleshooting

### Error: "DATABASE_URL must be set"

**Solusi**: Pastikan environment variable `DATABASE_URL` sudah di-set di Vercel Dashboard.

### Error: "Failed to connect to database"

**Solusi**:

1. Check DATABASE_URL format
2. Pastikan ada `?sslmode=require` di akhir URL
3. Test koneksi dari local dengan psql

### Cron Job tidak jalan

**Solusi**:

1. Pastikan `CRON_SECRET` sudah di-set
2. Check Vercel Dashboard → Cron Jobs
3. Cron jobs hanya aktif di production deployment

### Charts tidak muncul data

**Solusi**:

1. Klik tombol "Sync Data" manual
2. Check API response di Network tab browser
3. Verifikasi Antares API credentials

---

## 📊 Monitoring

### Check Database Size

Neon Dashboard → Your Project → "Usage"

### Check API Usage

Vercel Dashboard → Your Project → "Analytics"

### Check Antares Connection

Dashboard → System Information → Connection Status harus "Connected"

---

## 💰 Cost Estimation

**100% GRATIS** dengan:

- ✅ Vercel Free Tier: Unlimited deployments
- ✅ Neon Free Tier: 10 projects, 0.5 GB storage
- ✅ Antares IoT: Sesuai plan Anda

**Recommended untuk production**:

- Vercel Pro: $20/month (jika butuh custom domain + teams)
- Neon Pro: $19/month (jika butuh storage > 10 GB)

---

## 🆘 Need Help?

1. Check Vercel Logs: Dashboard → Logs
2. Check Neon Status: https://neon.tech/status
3. Test API: https://your-app.vercel.app/api/system-status

**Common Issues**: Lihat section Troubleshooting di atas.

---

Selamat! Website monitoring hidroponik Anda sudah live! 🎉🌱
