# 🚂 Railway Deployment Rehberi

## Adım 1: Railway Hesabı Oluştur

1. **Railway'a Git**: https://railway.app
2. **"Start a New Project"** butonuna tıkla
3. **GitHub ile giriş yap** (en kolay yol)
4. Railway'a GitHub repository'lerine erişim izni ver

---

## Adım 2: Backend Servisi Oluştur

### 2.1 Yeni Servis Ekle
1. Railway dashboard'da **"New Project"** butonuna tıkla
2. **"Deploy from GitHub repo"** seçeneğini seç
3. Repository'ni seç: `kyc-flow`
4. Railway otomatik olarak projeyi tarar

### 2.2 Backend Servisini Yapılandır
1. **"Add Service"** → **"GitHub Repo"** seç
2. Aynı repository'yi seç
3. **Settings** sekmesine git:
   - **Root Directory**: `backend` yaz
   - **Start Command**: `npm start` (otomatik gelir)
   - **Build Command**: `npm install` (otomatik gelir)

### 2.3 Environment Variables Ekle
**Variables** sekmesine git ve şunları ekle:

```bash
# Server
PORT=3001
NODE_ENV=production

# Clerk
CLERK_SECRET_KEY=sk_test_xxxxx (veya sk_live_xxxxx)
CLERK_PUBLISHABLE_KEY=pk_test_xxxxx (opsiyonel, sadece kontrol için)

# Groq AI
GROQ_API_KEY=your_groq_api_key_here

# Cloudflare R2
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com

# Database (eğer Prisma kullanıyorsan)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# CORS - Frontend URL'i (önemli!)
FRONTEND_URL=https://your-frontend-service.railway.app
```

**Not**: `FRONTEND_URL`'i şimdilik boş bırak, frontend deploy ettikten sonra güncelle.

### 2.4 Domain Ayarla
1. **Settings** → **Networking** sekmesine git
2. **"Generate Domain"** butonuna tıkla
3. Backend URL'ini kopyala (örnek: `kyc-backend-production.up.railway.app`)

---

## Adım 3: Frontend Servisi Oluştur

### 3.1 Yeni Servis Ekle
1. Aynı project içinde **"Add Service"** → **"GitHub Repo"**
2. Aynı repository'yi seç

### 3.2 Frontend Servisini Yapılandır
**Settings** sekmesine git:
- **Root Directory**: `frontend` yaz
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run serve` (veya `npx serve -s build -l $PORT`)

### 3.3 Environment Variables Ekle
**Variables** sekmesine git ve şunları ekle:

```bash
# API URL - Backend servisinin URL'i
REACT_APP_API_URL=https://your-backend-service.railway.app

# Clerk
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx (veya pk_live_xxxxx)
```

**Önemli**: `REACT_APP_API_URL`'i backend servisinin URL'i ile değiştir!

### 3.4 Domain Ayarla
1. **Settings** → **Networking** sekmesine git
2. **"Generate Domain"** butonuna tıkla
3. Frontend URL'ini kopyala

---

## Adım 4: Backend'i Güncelle

Frontend URL'ini aldıktan sonra:

1. Backend servisine git
2. **Variables** sekmesine git
3. `FRONTEND_URL` değişkenini güncelle:
   ```
   FRONTEND_URL=https://your-frontend-service.railway.app
   ```
4. **"Redeploy"** butonuna tıkla (veya otomatik redeploy olur)

---

## Adım 5: Clerk Dashboard'u Güncelle

1. **Clerk Dashboard**'a git: https://dashboard.clerk.com
2. **Your Application** → **Settings** → **Paths**
3. **Allowed callback URLs** ekle:
   ```
   https://your-frontend-service.railway.app
   https://your-frontend-service.railway.app/auth/*
   ```
4. **Allowed sign-out redirect URLs** ekle:
   ```
   https://your-frontend-service.railway.app
   ```
5. **Allowed origins** ekle:
   ```
   https://your-frontend-service.railway.app
   https://your-backend-service.railway.app
   ```

---

## Adım 6: Test Et

1. **Backend Health Check**:
   ```
   https://your-backend-service.railway.app/health
   ```
   Cevap: `{"status":"ok"}` olmalı

2. **Frontend**:
   ```
   https://your-frontend-service.railway.app
   ```
   Sayfa açılmalı ve login olabilmelisin

---

## Sorun Giderme

### ❌ Build Hatası
- **Logs** sekmesine git ve hata mesajını kontrol et
- Node version kontrol et (18+ olmalı)
- `npm install` hatalarını kontrol et

### ❌ CORS Hatası
- Backend'de `FRONTEND_URL` doğru mu kontrol et
- Frontend URL'i tam olarak eşleşmeli (trailing slash olmadan)

### ❌ 404 Not Found
- Root Directory doğru mu kontrol et (`backend` veya `frontend`)
- Start Command doğru mu kontrol et

### ❌ Clerk Auth Hatası
- Clerk dashboard'da callback URL'leri ekledin mi?
- Environment variables doğru mu?

### ❌ Port Hatası
- Railway otomatik olarak `PORT` environment variable'ını set eder
- Backend'de `process.env.PORT` kullanıldığından emin ol

---

## Önemli Notlar

1. **Environment Variables**: Production'da `sk_live_` ve `pk_live_` kullan
2. **Database**: Eğer Prisma kullanıyorsan, Railway'de PostgreSQL ekleyebilirsin
3. **File Storage**: `db.json` ve `settings.json` dosyaları Railway'de persist olmaz, environment variables kullan
4. **Logs**: Railway dashboard'da **Logs** sekmesinden canlı logları görebilirsin
5. **Redeploy**: Her değişiklikten sonra otomatik redeploy olur (GitHub push)

---

## Hızlı Komutlar

### Railway CLI (Opsiyonel)
```bash
# Railway CLI kur
npm i -g @railway/cli

# Login
railway login

# Projeyi bağla
railway link

# Environment variables ekle
railway variables set KEY=value

# Logları gör
railway logs

# Deploy
railway up
```

---

## Maliyet

- **Free Tier**: 
  - $5 kredi/ay
  - Yeterli küçük projeler için
- **Pro Plan**: 
  - $20/ay
  - Daha fazla kaynak

---

## Başarı! 🎉

Artık projen canlıda! URL'lerini paylaşabilirsin.

**Backend**: `https://your-backend.railway.app`  
**Frontend**: `https://your-frontend.railway.app`

