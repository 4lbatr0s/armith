# Kinde Authentication Setup

This document describes the OAuth/OIDC authentication implementation using Kinde for both React frontend and Express backend.

## Overview

The application now uses Kinde for authentication instead of Firebase. Kinde provides a complete OAuth 2.0/OpenID Connect solution with session-based authentication.

## Frontend (React)

### Configuration
- **Provider**: `@kinde-oss/kinde-auth-react`
- **Client ID**: `e747f7340ece46d7be9a54ef6f9f22c3`
- **Domain**: `https://armith.kinde.com`
- **Redirect URI**: `http://localhost:3000`

### Key Components

1. **App.jsx**: Wrapped with `KindeProvider`
2. **AuthPage.jsx**: Simplified authentication page with Kinde login buttons
3. **ProtectedRoute.jsx**: Uses `useKindeAuth` hook for authentication checks
4. **Layout.jsx**: Shows user info and logout functionality
5. **KindeCallback.jsx**: Handles OAuth callback redirects

### Authentication Flow
1. User clicks "Sign in with Kinde" on `/auth` page
2. Redirected to Kinde authentication page
3. After successful authentication, redirected back to `/kinde_callback`
4. Callback component redirects to `/test-kyc-flow` or `/auth` based on auth status

## Backend (Express)

### Configuration
- **Package**: `@kinde-oss/kinde-node-express`
- **Client ID**: `900a724a047c4b5392ee61d2f8ca2ce5`
- **Issuer Base URL**: `https://armith.kinde.com`
- **Secret**: `rGYgWgfRV6UPlGCzcxMFTOc73XTx8UK1oJyBF8LBydJOFpZYYiqGG`
- **Redirect URL**: `http://localhost:3000/kinde_callback`

### Key Features

1. **Session Management**: Uses `express-session` for session storage
2. **Route Protection**: `protectRoute` middleware protects authenticated endpoints
3. **User Data**: `getUser` middleware adds user info to `req.user`
4. **CORS**: Configured to support credentials for session-based auth

### Protected Routes
All KYC routes now use Kinde authentication:
- `/api/kyc/upload-url`
- `/api/kyc/secure-download-url`
- `/api/kyc/id-check`
- `/api/kyc/selfie-check`
- `/api/kyc/status/:userId`

### Authentication Endpoints
- `GET /api/auth/profile` - Get user profile (protected)
- `GET /api/auth/status` - Check authentication status (protected)
- `GET /login` - Redirect to Kinde login
- `GET /logout` - Redirect to Kinde logout

## Testing

### Test Page
Visit `/test-auth` to test the authentication flow:
- Shows frontend authentication status
- Tests backend authentication endpoints
- Displays user information from both frontend and backend

### Manual Testing Steps
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm start`
3. Visit `http://localhost:3000/test-auth`
4. Click "Sign In with Kinde"
5. Complete authentication on Kinde
6. Verify both frontend and backend show authenticated status

## Environment Variables

### Backend (.env)
```
SESSION_SECRET=your-secret-key
PORT=3001
```

### Frontend
```
REACT_APP_API_URL=http://localhost:3001
```

## Kinde Configuration

### Required Settings in Kinde Dashboard
1. **Allowed callback URLs**: `http://localhost:3000`
2. **Allowed logout redirect URLs**: `http://localhost:3000`
3. **Scopes**: `openid profile email`

## Migration Notes

### Removed
- Firebase authentication (`firebase` package)
- Firebase Auth Context (`AuthContext.jsx`)
- Firebase middleware (`authMiddleware.js`)
- Firebase authentication routes

### Updated
- All protected routes now use Kinde middleware
- API service updated to use session-based authentication
- Authentication components simplified

## Security Considerations

1. **Session Security**: Sessions are stored server-side with secure cookies
2. **CORS**: Properly configured to allow credentials
3. **HTTPS**: Required in production (set `secure: true` in session config)
4. **Session Secret**: Use a strong, random secret in production

## Production Deployment

### Backend Changes
```javascript
// In app.js
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true } // Enable for HTTPS
}));
```

### Frontend Changes
```javascript
// Update KindeProvider URLs for production
<KindeProvider
  clientId="your-production-client-id"
  domain="https://your-domain.kinde.com"
  redirectUri="https://your-app.com"
  logoutUri="https://your-app.com"
>
```

### Kinde Dashboard
Update production URLs in Kinde dashboard:
- Allowed callback URLs: `https://your-app.com`
- Allowed logout redirect URLs: `https://your-app.com`
