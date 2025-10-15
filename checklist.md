# ✅ Deployment Checklist

Gunakan checklist ini untuk memastikan semua langkah deployment sudah benar.

---

## 📁 Phase 1: File Preparation ui

### Required Files

- [x] `vercel.json` - Vercel configuration
- [x] `.vercelignore` - Files to exclude from deployment
- [x] `.env.example` - Environment variables template
- [x] `README.md` - Main documentation
- [x] `DEPLOYMENT.md` - Deployment guide
- [x] `QUICKSTART.md` - Quick reference guide
- [x] `CHECKLIST.md` - This file

### API Endpoints (Serverless Functions)

- [x] `api/sensor-readings.ts` - Main sensor endpoint
- [x] `api/sensor-readings/latest.ts` - Latest reading
- [x] `api/sensor-readings/range.ts` - Time range query
- [x] `api/sync-antares.ts` - Manual sync
- [x] `api/system-status.ts` - System status
- [x] `api/alert-settings.ts` - Alert configuration
- [x] `api/export-data.ts` - Data export
- [x] `api/cron/sync-antares.ts` - Auto-sync cron

### Server Files (Updated)

- [x] `server/db.ts` - Neon connection
- [x] `server/schema.ts` - Database schema (Drizzle)
- [x] `server/services/antares.ts` - Antares API client

### Configuration Files

- [x] `package.json` - Dependencies & scripts
- [x] `tsconfig.json` - TypeScript config
- [x] `drizzle.config.ts` - Database config
- [x] `.gitignore` - Git ignore rules

### Scripts

- [x] `scripts/seed-database.ts` - Database seeder

---

## 🗄️ Phase 2: Database Setup

### Neon Account

```bash
□ Create account at https://neon.tech
□ Verify email
□ Login successful
```

### Create Database Project

```bash
□ Click "Create a project"
□ Project name: hydroponic-monitoring
□ Region: Singapore (ap-southeast-1)
□ Postgres version: 16
□ Click "Create project"
```

### Get Connection String

```bash
□ Copy connection string from dashboard
□ Format verification:
  postgresql://[user]:[pass]@[host].aws.neon.tech/[db]?sslmode=require
□ Connection string saved securely
```

### Test Connection (Optional)

```bash
□ Install psql client
□ Run: psql "YOUR_DATABASE_URL"
□ Connection successful
□ Exit: \q
```

---

## 💻 Phase 3: Local Development

### Clone & Install

```bash
□ git clone <repository-url>
□ cd hydroponic-monitoring
□ npm install
□ No installation errors
```

### Environment Configuration

```bash
□ cp .env.example .env
□ Edit .env file
□ Set ANTARES_API_KEY
□ Set ANTARES_APPLICATION_ID
□ Set ANTARES_DEVICE_ID
□ Set DATABASE_URL (from Neon)
□ Generate CRON_SECRET:
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
□ All 8 environment variables set
```

### Database Setup

```bash
□ npm run db:push
□ Schema applied successfully
□ No errors in console
```

### Seed Sample Data (Optional)

```bash
□ npm run seed
□ 144 sample readings inserted
□ System status created
□ Alert settings created
```

### Local Testing

```bash
□ npm run dev
□ Server starts on port 5000
□ No errors in console
□ Open http://localhost:5000
□ Dashboard loads successfully
□ Charts render with data
□ Click "Sync Data" button
□ Sync successful
```

### API Testing (Local)

```bash
□ curl http://localhost:5000/api/system-status
□ curl http://localhost:5000/api/sensor-readings
□ curl -X POST http://localhost:5000/api/sync-antares
□ All endpoints return valid JSON
```

---

## 🐙 Phase 4: GitHub Setup

### Create Repository

```bash
□ Login to github.com
□ Click "New repository"
□ Repository name: hydroponic-monitoring
□ Visibility: Public or Private
□ Do NOT initialize with README
□ Create repository
```

### Push Code

```bash
□ git init (if not initialized)
□ git add .
□ git commit -m "Initial commit - ready for Vercel"
□ git remote add origin <your-repo-url>
□ git branch -M main
□ git push -u origin main
□ Code visible on GitHub
```

### Verify Files

```bash
□ Check GitHub repository
□ All files uploaded
□ .env NOT in repository (check .gitignore working)
□ node_modules NOT in repository
```

---

## ☁️ Phase 5: Vercel Deployment

### Import Project

```bash
□ Login to vercel.com
□ Click "Add New..." → "Project"
□ Select "Import Git Repository"
□ Choose hydroponic-monitoring repo
□ Click "Import"
```

### Configure Build Settings

```bash
□ Framework Preset: Vite
□ Build Command: npm run vercel-build
□ Output Directory: dist/public
□ Install Command: npm install
□ Root Directory: ./ (default)
```

### Environment Variables

Add semua dari `.env`:

```bash
□ ANTARES_API_KEY
□ ANTARES_APPLICATION_ID
□ ANTARES_BASE_URL
□ ANTARES_DEVICE_ID
□ DATABASE_URL
□ CRON_SECRET
□ NODE_ENV (set to: production)
□ All 7 variables added
□ Save changes
```

### Deploy

```bash
□ Click "Deploy"
□ Wait for build (2-3 minutes)
□ Deployment successful
□ No build errors
□ Copy production URL
```

---

## ✨ Phase 6: Production Verification

### Website Access

```bash
□ Open https://YOUR_APP.vercel.app
□ Website loads successfully
□ No 404 errors
□ No CORS errors in console
```

### Dashboard Functionality

```bash
□ Status cards show data
□ Temperature card working
□ pH Level card working
□ TDS Level card working
□ All charts rendering
□ Time range buttons work (24H, 7D, 30D)
□ Recent readings table populated
□ System information showing
```

### API Endpoints (Production)

```bash
□ curl https://YOUR_APP.vercel.app/api/system-status
□ curl https://YOUR_APP.vercel.app/api/sensor-readings
□ curl https://YOUR_APP.vercel.app/api/sensor-readings/latest
□ curl -X POST https://YOUR_APP.vercel.app/api/sync-antares
□ All endpoints return 200 OK
□ Data is valid JSON
```

### Manual Features

```bash
□ Click "Sync Data" button
□ Toast notification appears
□ New data fetched successfully
□ Charts update with new data
□ Click "Export" button
□ CSV file downloads
□ CSV contains valid data
```

### Cron Job Setup

```bash
□ Open Vercel Dashboard
□ Navigate to project → Settings → Cron Jobs
□ Verify cron job exists:
  Path: /api/cron/sync-antares
  Schedule: */10 * * * * (every 10 minutes)
□ Check last execution time
□ Check execution logs
```

---

## 🔍 Phase 7: Monitoring Setup

### Vercel Analytics

```bash
□ Enable Analytics in Vercel Dashboard
□ Check deployment logs
□ Monitor function invocations
□ Review error logs
```

### Database Monitoring

```bash
□ Open Neon Dashboard
□ Check "Usage" tab
□ Monitor storage usage
□ Check connection count
□ Review query performance
```

### Antares Monitoring

```bash
□ Login to platform.antares.id
□ Check device status
□ Verify data stream
□ Check last data timestamp
```

---

## 🧪 Phase 8: Testing Matrix

### Functional Tests

```bash
□ Dashboard loads in < 3 seconds
□ Charts render correctly
□ Data updates on sync
□ Export CSV works
□ Export JSON works
□ Time range filters work
□ Status indicators accurate
□ Alerts configurable
```

### Browser Compatibility

```bash
□ Chrome (latest)
□ Firefox (latest)
□ Safari (latest)
□ Edge (latest)
□ Mobile Chrome
□ Mobile Safari
```

### Performance Tests

```bash
□ Lighthouse score > 90
□ First Contentful Paint < 2s
□ Time to Interactive < 3s
□ No console errors
□ No memory leaks
```

### API Response Times

```bash
□ /api/system-status < 500ms
□ /api/sensor-readings < 1s
□ /api/sync-antares < 3s
□ Database queries optimized
```

---

## 📋 Phase 9: Documentation

### Repository Documentation

```bash
□ README.md complete
□ DEPLOYMENT.md detailed
□ QUICKSTART.md helpful
□ CHECKLIST.md (this file)
□ .env.example up to date
□ API endpoints documented
□ Troubleshooting section included
```

### Code Documentation

```bash
□ Complex functions commented
□ TypeScript types defined
□ API contracts clear
□ Environment variables documented
```

---

## 🎯 Phase 10: Final Checks

### Security

```bash
□ .env in .gitignore
□ No API keys in code
□ CRON_SECRET set
□ Database connection secure (SSL)
□ CORS properly configured
□ No sensitive data logged
```

### Performance

```bash
□ Database indexed properly
□ API responses cached where appropriate
□ Images optimized
□ Build size reasonable (< 5MB)
□ Serverless functions < 50MB
```

### Reliability

```bash
□ Error handling in all endpoints
□ Database connection retry logic
□ Antares API fallback
□ Logging implemented
□ Monitoring alerts set up
```

### Scalability

```bash
□ Database can handle growth
□ Serverless functions scalable
□ Neon auto-scaling configured
□ No hardcoded limits
```

---

## ✅ Deployment Complete!

Jika semua checklist di atas ✅, deployment Anda **SUKSES**! 🎉

### Next Steps

1. Monitor untuk 24 jam pertama
2. Check cron job berjalan otomatis
3. Verify data consistency
4. Share URL dengan team
5. Setup custom domain (optional)

### Support Resources

- 📚 [Full Documentation](./DEPLOYMENT.md)
- ⚡ [Quick Start Guide](./QUICKSTART.md)
- 🐛 [GitHub Issues](https://github.com/YOUR_USERNAME/hydroponic-monitoring/issues)

---

**Deployment Date**: **\*\***\_**\*\***

**Deployment By**: **\*\***\_**\*\***

**Production URL**: **\*\***\_**\*\***

**Notes**:

---

---

---
