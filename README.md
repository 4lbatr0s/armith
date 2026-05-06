# KYC Flow

KYC Flow is a frontend + backend identity verification project.

## Canonical Documentation

- Product and API docs: `frontend/docs/`
- API reference: `frontend/docs/reference/rest-api.md`
- Architecture and flow guides: `frontend/docs/guide/`

## Environments

- Local frontend URL: `http://localhost:3000`
- Local backend URL: `http://localhost:3001`
- Render frontend (dev): `https://armith.onrender.com`
- Render backend (dev): `https://armith-backend-live.onrender.com`

## Required Environment Variables

### Frontend

- `REACT_APP_API_URL`
- `REACT_APP_CLERK_PUBLISHABLE_KEY`

### Backend

- `FRONTEND_URL`
- `FRONTEND_URLS`
- `MONGODB_URI`
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `GROQ_API_KEY`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_ENDPOINT`

Use local `.env` files for local development, and set the same values in Render environment variables for deployed services.
