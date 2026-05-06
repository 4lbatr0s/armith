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

### Render frontend: Clerk + `/admin` and 404 after login

Clerk often **full-page redirects** to something like `/admin?__clerk_handshake=…`. The host must respond with **`index.html`** (and your JS bundle) for that path. If Render serves the app as a **Static Site** without an SPA rewrite, `/admin` is “not a file” and the CDN returns **404** — the React app never runs, so it is not a Clerk bug.

Verify:

```bash
curl -sI https://armith.onrender.com/admin | head -1
```

### Fix A — Recommended: Node Web Service + `serve -s build` (in `render.yaml`)

`frontend/package.json` includes the `serve` dependency and `"serve"` script (`serve -s build -l $PORT`). The repo Blueprint deploys the frontend as a **`web` service** (not static): build CRA, then `npm run serve` so **every path** falls back to `index.html`.

On Render you may need to **replace** the old **Static Site** with this Web Service (same repo, Root Directory `./frontend`), copy env vars (`REACT_APP_*`, Clerk keys), set `IGNORE_DOCS_BUILD=1`, then point your custom hostname / traffic to the web service.

### Fix B — Keep Static Site: CDN rewrite rule

Dashboard example (static site `armith-frontend`): https://dashboard.render.com/static/srv-d37rd16r433s73f08up0/settings — **Redirects / Rewrites**: **Source** `/*` → **Destination** `/index.html` → **Action** **Rewrite**.

**Background:** client-side routing and Clerk handshakes assume the SPA shell loads ([CRA deployment notes](https://create-react-app.dev/docs/deployment#serving-apps-with-client-side-routing)).

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
