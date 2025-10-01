# 🚀 Setup GitHub Actions Cron Job untuk Hydroponic Monitoring

Panduan lengkap setup cron job menggunakan GitHub Actions sebagai pengganti Vercel Cron (karena hobby plan terbatas).

---

## 📋 Prerequisites

- ✅ Repository sudah di-push ke GitHub
- ✅ Project sudah deployed di Vercel
- ✅ Database PostgreSQL (Neon) sudah setup

---

## 🔧 Step-by-Step Setup

### **Step 1: Buat File GitHub Actions Workflow**

1. Di root project, buat folder dan file:

   ```
   .github/workflows/cron-sync-antares.yml
   ```

2. Copy isi file dari artifact `cron-sync-antares.yml` yang sudah saya berikan

3. Commit dan push ke GitHub:
   ```bash
   git add .github/workflows/cron-sync-antares.yml
   git commit -m "Add GitHub Actions cron job for Antares sync"
   git push origin main
   ```

---

### **Step 2: Setup GitHub Secrets**

1. Buka repository di GitHub
2. Klik **Settings** → **Secrets and variables** → **Actions**
3. Klik **New repository secret**

**Tambahkan 2 secrets berikut:**

#### **Secret 1: CRON_SECRET**

- Name: `CRON_SECRET`
- Value: `78fc27a763f85e74f99f87ef6a20ff75cb2fb8041807f5e33c7ec9e19fdb4b2c`

  ⚠️ **PENTING:** Value harus **SAMA PERSIS** dengan yang ada di Vercel environment variables!

#### **Secret 2: VERCEL_PRODUCTION_URL**

- Name: `VERCEL_PRODUCTION_URL`
- Value: URL production Vercel Anda (tanpa trailing slash)

  Contoh: `https://hydroponic-monitoring.vercel.app`

  ❌ Salah: `https://hydroponic-monitoring.vercel.app/`  
  ✅ Benar: `https://hydroponic-monitoring.vercel.app`

---

### **Step 3: Verifikasi Environment Variables di Vercel**

1. Buka Vercel Dashboard → Project → **Settings** → **Environment Variables**
2. Pastikan variable berikut ada:

```bash
CRON_SECRET=78fc27a763f85e74f99f87ef6a20ff75cb2fb8041807f5e33c7ec9e19fdb4b2c
ANTARES_API_KEY=104364b8325b5796:f7e668e8b2fb4380
ANTARES_APPLICATION_ID=DRTPM-Hidroponik
ANTARES_DEVICE_ID=Monitoring_Hidroponik
ANTARES_BASE_URL=https://platform.antares.id:8443
DATABASE_URL=postgresql://neondb_owner:npg_Eo9vuhCz5JTs@ep-curly-grass-a1f50r6k-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
NODE_ENV=production
```

3. Pastikan semua environment untuk: **Production, Preview, Development**

---

### **Step 4: Update File Cron Endpoint**

1. Replace file `api/cron/sync-antares.ts` dengan versi updated dari artifact
2. Commit dan push:
   ```bash
   git add api/cron/sync-antares.ts
   git commit -m "Update cron endpoint with security improvements"
   git push origin main
   ```

---

### **Step 5: Test Manual Execution**

1. Buka GitHub repository
2. Klik tab **Actions**
3. Pilih workflow **"Sync Antares Data (Hydroponic Monitoring)"**
4. Klik **Run workflow** (dropdown button)
5. Isi reason (opsional): `Manual test - initial setup`
6. Klik **Run workflow** (green button)

7. **Tunggu eksekusi selesai** (~30 detik - 1 menit)

8. **Check logs:**
   - Klik workflow run yang baru saja dijalankan
   - Expand step "📡 Sync Antares to Database"
   - Lihat logs:
     ```
     ✅ Sync completed successfully!
     📊 HTTP Status: 200
     📦 Response Body: {...}
     ```

---

### **Step 6: Verifikasi Data Masuk**

1. Buka aplikasi hydroponic monitoring Anda di browser
2. Check dashboard - seharusnya ada data baru
3. Atau check langsung via API:
   ```bash
   curl https://your-app.vercel.app/api/sensor-readings/latest
   ```

---

## ⏰ Jadwal Cron (Customizable)

File workflow saat ini diset **setiap 10 menit**:

```yaml
schedule:
  - cron: "*/10 * * * *"
```

### **Pilihan Jadwal Lain:**

```yaml
# Setiap 5 menit (real-time monitoring)
- cron: "*/5 * * * *"

# Setiap 15 menit (recommended - balance antara update & resources)
- cron: "*/15 * * * *"

# Setiap 30 menit
- cron: "*/30 * * * *"

# Setiap jam
- cron: "0 * * * *"

# Setiap 6 jam (hemat resources)
- cron: "0 */6 * * *"

# Setiap hari jam 6 pagi
- cron: "0 6 * * *"
```

**Cara ganti jadwal:**

1. Edit file `.github/workflows/cron-sync-antares.yml`
2. Ubah value di `schedule.cron`
3. Commit & push

---

## 🔍 Monitoring & Troubleshooting

### **Lihat History Execution:**

1. GitHub → **Actions** tab
2. Pilih workflow
3. Lihat list runs (success ✅ atau failed ❌)

### **Check Logs Detail:**

1. Klik workflow run tertentu
2. Expand steps untuk lihat detail logs
3. Logs mencakup:
   - HTTP status code
   - Response body dari API
   - Error messages (jika ada)

### **Common Issues:**

#### ❌ **Error 401 Unauthorized**

**Penyebab:** `CRON_SECRET` tidak match antara GitHub & Vercel

**Solusi:**

1. Check GitHub Secret `CRON_SECRET`
2. Check Vercel Environment Variable `CRON_SECRET`
3. Pastikan **SAMA PERSIS** (case-sensitive, no spaces)

#### ❌ **Error 503 Service Unavailable**

**Penyebab:** Antares API tidak merespon atau error

**Solusi:**

1. Check Antares platform status
2. Verify credentials di Vercel env vars
3. Test manual: `POST https://your-app.vercel.app/api/sync-antares`

#### ❌ **Error 500 Internal Server Error**

**Penyebab:** Database connection error atau bug di code

**Solusi:**

1. Check Vercel function logs
2. Verify `DATABASE_URL` di Vercel
3. Check Neon database status

#### ⚠️ **Workflow tidak berjalan otomatis**

**Penyebab:** Repository private tanpa GitHub Actions minutes

**Solusi:**

1. Make repository public, atau
2. Upgrade GitHub plan untuk private repo minutes

---

## 📊 Vercel Cron vs GitHub Actions

### **Vercel Cron (Backup - Keep in vercel.json)**

- ✅ Sederhana, built-in
- ❌ Hobby plan: max 2 crons
- ❌ Max 1 invocation/minute
- Schedule: Every 6 hours (backup)

### **GitHub Actions (Primary)**

- ✅ Unlimited crons (public repo)
- ✅ Flexible scheduling
- ✅ Better logging & monitoring
- ✅ Manual trigger available
- Schedule: Every 10 minutes (primary)

**Strategy:** GitHub Actions sebagai primary, Vercel Cron sebagai backup jika GitHub Actions down.

---

## 🎯 Next Steps (Optional)

### **1. Add Notifications on Failure**

Edit workflow file, uncomment bagian notification:

```yaml
- name: 🔔 Notify on Failure
  if: failure()
  run: |
    curl -X POST ${{ secrets.DISCORD_WEBHOOK_URL }} \
      -H "Content-Type: application/json" \
      -d '{"content":"❌ Hydroponic sync failed! Check GitHub Actions."}'
```

Setup Discord webhook:

1. Discord Server Settings → Integrations → Webhooks
2. Create webhook, copy URL
3. Add GitHub Secret `DISCORD_WEBHOOK_URL`

### **2. Add Multiple Cron Jobs**

Buat file workflow baru untuk tugas lain:

```
.github/workflows/cron-cleanup.yml    # Cleanup old data
.github/workflows/cron-backup.yml     # Backup database
.github/workflows/cron-report.yml     # Generate reports
```

### **3. Optimize Sync Frequency**

Monitor data pattern, adjust schedule:

- Jika sensor jarang berubah: setiap 30 menit
- Jika butuh real-time: setiap 5 menit
- Balance: setiap 15 menit (recommended)

---

## ✅ Checklist Setup

- [ ] File workflow `.github/workflows/cron-sync-antares.yml` dibuat
- [ ] Push workflow file ke GitHub
- [ ] GitHub Secret `CRON_SECRET` ditambahkan
- [ ] GitHub Secret `VERCEL_PRODUCTION_URL` ditambahkan
- [ ] Vercel environment variables diverifikasi
- [ ] File `api/cron/sync-antares.ts` diupdate
- [ ] Test manual execution dari GitHub Actions
- [ ] Verifikasi data masuk ke database
- [ ] Monitor 1-2 jam untuk pastikan auto-run success
- [ ] (Opsional) Setup notification on failure

---

## 🆘 Need Help?

Jika ada masalah:

1. Check GitHub Actions logs
2. Check Vercel function logs
3. Test endpoint manual: `curl -X POST https://your-app.vercel.app/api/cron/sync-antares -H "Authorization: Bearer YOUR_CRON_SECRET"`

---

**Happy Monitoring! 🌱🚀**
