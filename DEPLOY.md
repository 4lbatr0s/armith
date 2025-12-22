# 🚀 Deployment Guide

## En Hızlı Deploy: Railway (Önerilen) ⚡

### Adımlar:

1. **Railway'a Git**: https://railway.app
2. **GitHub ile Giriş Yap**
3. **"New Project" → "Deploy from GitHub repo"**
4. **Repository'yi seç**
5. **İki servis oluştur:**

#### Backend Service:
- **Root Directory**: `backend`
- **Start Command**: `npm start`
- **Environment Variables** (`.env` dosyasından):
  ```
  PORT=3001
  NODE_ENV=production
  CLERK_SECRET_KEY=your_clerk_secret
  GROQ_API_KEY=your_groq_key
  R2_ACCOUNT_ID=your_r2_account
  R2_ACCESS_KEY_ID=your_r2_key
  R2_SECRET_ACCESS_KEY=your_r2_secret
  R2_BUCKET_NAME=your_bucket
  R2_ENDPOINT=your_r2_endpoint
  FRONTEND_URL=https://your-frontend-url.railway.app
  ```

#### Frontend Service:
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run serve` (veya `npx serve -s build -l $PORT`)
- **Environment Variables**:
  ```
  REACT_APP_API_URL=https://your-backend-url.railway.app
  REACT_APP_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
  ```

6. **Custom Domain ekle** (opsiyonel)

---

## Alternatif: Vercel (Frontend) + Railway (Backend)

### Frontend (Vercel):
1. https://vercel.com → GitHub ile giriş
2. "Import Project" → Repository seç
3. **Root Directory**: `frontend`
4. **Build Command**: `npm run build`
5. **Output Directory**: `build`
6. **Environment Variables**:
   ```
   REACT_APP_API_URL=https://your-backend.railway.app
   REACT_APP_CLERK_PUBLISHABLE_KEY=your_key
   ```

### Backend (Railway):
- Yukarıdaki Backend Service adımlarını takip et

---

## Alternatif: Render (Ücretsiz)

1. https://render.com → GitHub ile giriş
2. **New → Web Service**
3. **Backend için:**
   - Root Directory: `backend`
   - Build: `npm install`
   - Start: `npm start`
4. **Frontend için:**
   - New → Static Site
   - Root Directory: `frontend`
   - Build: `npm install && npm run build`
   - Publish: `build`

---

## Environment Variables Checklist

### Backend (.env):
```bash
PORT=3001
NODE_ENV=production
CLERK_SECRET_KEY=
GROQ_API_KEY=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=
FRONTEND_URL=
```

### Frontend (.env):
```bash
REACT_APP_API_URL=
REACT_APP_CLERK_PUBLISHABLE_KEY=
```

---

## Hızlı Test:

1. Backend health check: `https://your-backend.railway.app/health`
2. Frontend: `https://your-frontend.railway.app`

---

## Notlar:

- **Railway**: En kolay, full-stack, ücretsiz tier var
- **Vercel**: Frontend için en hızlı, CDN desteği
- **Render**: Ücretsiz tier, kolay setup
- **Database**: Railway'de PostgreSQL ekleyebilirsin (Prisma için)

---

## Sorun Giderme:

### CORS Hatası:
- `FRONTEND_URL` environment variable'ını backend'de doğru ayarla

### Build Hatası:
- Node version kontrol et (18+)
- `npm install` hatalarını kontrol et

### Clerk Auth Hatası:
- Clerk dashboard'da callback URL'leri ekle:
  - `https://your-frontend.railway.app`
  - `https://your-backend.railway.app`
