# 🚀 Deployment Guide: Fly.io (Backend) + Vercel (Frontend)

**Cost: $0/month** (Free tiers only)

---

## 📋 Prerequisites

- GitHub account
- Fly.io account (free, no credit card for free tier)
- Vercel account (free)
- External MariaDB/MySQL database (see options below)

---

## 🗄️ Step 0: Database Setup (Choose ONE)

Your backend needs MariaDB. Fly.io free tier (256MB RAM) is too small for MariaDB + Node + Puppeteer.

### Option A: PlanetScale (MySQL) — **Recommended** ⭐
- 5GB free, MySQL-compatible, serverless
- Sign up: https://planetscale.com
- Create database → Get connection details
- **Note**: Change `dialect: "mariadb"` to `dialect: "mysql"` in `config/db.js`

### Option B: Neon (PostgreSQL)
- 512MB free, but requires changing dialect to PostgreSQL

### Option C: Supabase (PostgreSQL)
- 500MB free, same as Neon

### Option D: Railway (MariaDB only)
- Use Railway's $5 credit just for MariaDB addon
- Then deploy backend on Fly.io

---

## 🐳 Step 1: Backend → Fly.io

### 1.1 Install flyctl
```powershell
# Windows PowerShell (Admin)
iwr https://fly.io/install.ps1 -useb | iex

# Restart terminal, then verify:
flyctl version
```

### 1.2 Login & Launch
```bash
cd "C:\Users\korba\Downloads\erp\med erp\backend"

fly auth login
fly launch --no-deploy --name nimi-erp-backend --region bom
```
- Choose: **"Use existing Dockerfile"**
- Say **No** to PostgreSQL (using external DB)
- Say **No** to Redis

### 1.3 Create Persistent Volumes
```bash
# WhatsApp auth (persists QR scan)
fly volumes create whatsapp_auth --size 1 --region bom

# Uploads (profile images, documents)
fly volumes create uploads --size 1 --region bom
```

### 1.4 Set Secrets (Environment Variables)
```bash
# Copy-paste this entire block, replace YOUR_VALUES:
fly secrets set \
  NODE_ENV=production \
  PORT=8080 \
  TZ=Asia/Kolkata \
  DB_HOST=YOUR_DB_HOST \
  DB_PORT=3306 \
  DB_USER=YOUR_DB_USER \
  DB_PASS=YOUR_DB_PASSWORD \
  DB_NAME=YOUR_DB_NAME \
  JWT_SECRET="GENERATE_A_LONG_RANDOM_STRING_HERE" \
  COMPANY_NAME="NIMI PRIVATE LIMITED" \
  COMPANY_SHORT_NAME=ERP \
  COMPANY_TAGLINE="Business Management Platform" \
  COMPANY_ADDRESS="NIMI PRIVATE LIMITED, Registered Office Address" \
  COMPANY_CITY=City \
  COMPANY_STATE=State \
  COMPANY_PINCODE=PINCODE \
  COMPANY_PHONE="+91-XXXXXXXXXX" \
  COMPANY_EMAIL=info@nimipl.com \
  COMPANY_WEBSITE=https://nimipl.com \
  COMPANY_WHATSAPP="+91-XXXXXXXXXX" \
  COMPANY_LOGO_URL=https://nimipl.com/logo.png \
  FRONTEND_URL=https://YOUR_FRONTEND.vercel.app \
  FRONTEND_LOGIN_URL=https://YOUR_FRONTEND.vercel.app/auth/login \
  SMTP_HOST=info@nimipl.com \
  SMTP_PORT=465 \
  SMTP_USER=info@nimipl.com \
  SMTP_PASS=nimi@2026 \
  DEFAULT_FROM_EMAIL=info@nimipl.com \
  CERT_SIGNATORY_NAME="NIMI PRIVATE LIMITED Authorized Signatory" \
  CERT_SIGNATORY_ROLE="NIMI PRIVATE LIMITED Authorized Signatory" \
  PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 1.5 Deploy Backend
```bash
fly deploy
```

### 1.6 Scan WhatsApp QR Code
```bash
# Watch logs for QR code
fly logs -a nimi-erp-backend

# When you see the QR code, scan it with WhatsApp on your phone
# Auth will persist in the volume
```

### 1.7 Verify Backend
```bash
# Health check
curl https://nimi-erp-backend.fly.dev/api/health

# Should return: {"status":"ok",...}
```

---

## 🌐 Step 2: Frontend → Vercel

### 2.1 Push to GitHub
```bash
cd "C:\Users\korba\Downloads\erp\med erp"
git init
git add .
git commit -m "Initial commit: ERP with Fly.io + Vercel deployment"
# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2.2 Deploy on Vercel
1. Go to https://vercel.com → **"Add New Project"**
2. Import your GitHub repo
3. **Root Directory**: `backend/frontend`
4. **Framework Preset**: Vite
5. **Build Command**: `npm run build`
6. **Output Directory**: `dist`
7. **Environment Variables**:
   ```
   VITE_API_BASE_URL=https://nimi-erp-backend.fly.dev/api
   VITE_API_BASE_URL_IMG=https://nimi-erp-backend.fly.dev
   ```
8. Click **Deploy**

### 2.3 Update Backend CORS
After Vercel gives you a URL (e.g., `https://erp-nimi.vercel.app`):

```bash
fly secrets set FRONTEND_URL=https://erp-nimi.vercel.app FRONTEND_LOGIN_URL=https://erp-nimi.vercel.app/auth/login
fly deploy
```

---

## ✅ Step 3: Verify Full Stack

| URL | Should Show |
|-----|-------------|
| `https://your-frontend.vercel.app` | Login page |
| `https://your-frontend.vercel.app/api/health` | JSON: `{"status":"ok"}` |
| `https://nimi-erp-backend.fly.dev/api/health` | JSON: `{"status":"ok"}` |
| `https://nimi-erp-backend.fly.dev/api-docs` | Swagger UI |

---

## 🔧 Troubleshooting

### WhatsApp not connecting?
```bash
# Check logs
fly logs -a nimi-erp-backend

# If stuck, restart
fly apps restart nimi-erp-backend
```

### Database connection failed?
- Verify `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` in secrets
- For PlanetScale: enable "Allow public access" or use proxy
- Check Fly.io can reach your DB IP (some providers block)

### Out of Memory (OOM)?
```bash
# Increase memory (still free tier)
fly scale memory 512 --app nimi-erp-backend
```

### Build fails?
```bash
# Check build logs
fly deploy --build-only
```

---

## 📝 Files Changed for Deployment

| File | Purpose |
|------|---------|
| `backend/Dockerfile` | Container definition with Puppeteer deps |
| `backend/fly.toml` | Fly.io config (volumes, health checks, scaling) |
| `backend/.dockerignore` | Excludes node_modules, logs, auth from build |
| `backend/server.js` | Binds to `0.0.0.0:8080` (Fly.io requirement) |
| `backend/app.js` | Added `/api/health`, CORS for Vercel |
| `backend/utils/whatsappBot.js` | Uses `/app/whatsapp_auth` volume in production |
| `backend/frontend/vite.config.js` | Added `base` config for Vercel |
| `backend/frontend/vercel.json` | Vercel deployment config |

---

## 💰 Cost Summary

| Service | Free Tier Limit | Your Usage |
|---------|-----------------|------------|
| Fly.io | 3 shared-cpu-1x VMs (256MB each), 3GB volumes | 1 VM + 2 volumes = **Free** |
| Vercel | Unlimited personal projects | **Free** |
| PlanetScale | 5GB storage, 1B rows/mo | **Free** |
| **Total** | | **$0/month** |

---

## 🚨 Important Notes

1. **WhatsApp QR Scan**: Must scan within ~20 seconds of deploy. Check `fly logs` immediately after deploy.

2. **Volume Persistence**: `whatsapp_auth` volume keeps WhatsApp session. If you destroy the app, you'll need to re-scan.

3. **Auto-sleep**: Disabled in `fly.toml` (`auto_stop_machines = false`) so cron jobs + WhatsApp stay alive.

4. **Cron Jobs**: Run inside the same process (no separate worker needed).

5. **Puppeteer**: Uses system Chromium (installed in Dockerfile) to save memory.

6. **MariaDB vs MySQL**: If using PlanetScale, change `dialect: "mariadb"` to `dialect: "mysql"` in `config/db.js`.

---

## 🔄 Future Updates

```bash
# Backend updates
cd backend
git add .
git commit -m "Update"
git push
fly deploy

# Frontend updates
cd ../..
git add .
git commit -m "Update"
git push
# Vercel auto-deploys
```

---

## 📞 Support

- Fly.io Docs: https://fly.io/docs/
- Vercel Docs: https://vercel.com/docs
- PlanetScale Docs: https://planetscale.com/docs

**Your backend URL**: `https://nimi-erp-backend.fly.dev`
**Your frontend URL**: `https://your-project.vercel.app`