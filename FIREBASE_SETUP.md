# Firebase Authentication Setup Guide

This guide will help you set up Firebase Authentication for the KYC Flow application with Google Sign-In and Phone OTP authentication.

## Prerequisites

1. A Google account
2. Access to Firebase Console

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name (e.g., "kyc-flow-app")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable the following providers:

### Google Authentication
1. Click on "Google" provider
2. Toggle "Enable"
3. Add your project support email
4. Click "Save"

### Phone Authentication
1. Click on "Phone" provider
2. Toggle "Enable"
3. Add test phone numbers (optional, for development)
4. Click "Save"

## Step 3: Create Web App

1. In your Firebase project, click the web icon (`</>`)
2. Register your app with a nickname (e.g., "kyc-flow-web")
3. Copy the Firebase configuration object
4. Click "Continue to console"

## Step 4: Generate Service Account Key

1. Go to Project Settings (gear icon)
2. Go to "Service accounts" tab
3. Click "Generate new private key"
4. Download the JSON file and keep it secure

## Step 5: Configure Backend

1. Copy `backend/env.firebase.example` to `backend/.env`
2. Fill in the Firebase configuration from your service account JSON:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id

# Add other existing environment variables...
DATABASE_URL="file:./db.sqlite"
```

## Step 6: Configure Frontend

1. Copy `frontend/env.firebase.example` to `frontend/.env.local`
2. Fill in the Firebase web app configuration:

```env
# Firebase Web App Configuration
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# API Configuration
REACT_APP_API_URL=http://localhost:3001
```

## Step 7: Set Up Domain Configuration

1. In Firebase Console, go to Authentication > Settings
2. Add your domains to "Authorized domains":
   - `localhost` (for development)
   - Your production domain (when deploying)

## Step 8: Configure Phone Authentication (Optional)

For phone authentication to work in production, you need to:

1. **Enable App Check** (recommended for production)
2. **Configure reCAPTCHA** for web apps
3. **Set up billing** (required for phone authentication)

## Step 9: Test the Setup

1. Start the backend:
   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm start
   ```

3. Navigate to `http://localhost:3000/auth`
4. Test Google Sign-In
5. Test Phone OTP authentication

## Security Considerations

1. **Never commit** `.env` files or service account keys to version control
2. **Use environment variables** in production
3. **Enable App Check** for production to prevent abuse
4. **Set up proper CORS** configuration
5. **Use HTTPS** in production

## Troubleshooting

### Common Issues

1. **"Firebase App named '[DEFAULT]' already exists"**
   - This usually happens when Firebase is initialized multiple times
   - Check that you're not importing Firebase config in multiple places

2. **"auth/unauthorized-domain"**
   - Add your domain to authorized domains in Firebase Console

3. **"auth/invalid-api-key"**
   - Check that your API key is correct in the environment variables

4. **Phone authentication not working**
   - Ensure you have enabled phone authentication in Firebase Console
   - Check that reCAPTCHA is properly configured
   - Verify billing is set up (required for phone auth)

### Debug Mode

To enable debug logging in development:

1. Add to your browser console:
   ```javascript
   localStorage.setItem('firebase:debug', 'true');
   ```

2. Or add to your environment:
   ```env
   REACT_APP_FIREBASE_DEBUG=true
   ```

## Production Deployment

1. **Update environment variables** with production values
2. **Enable App Check** for additional security
3. **Set up proper CORS** configuration
4. **Use HTTPS** for all communication
5. **Monitor usage** in Firebase Console

## Features Implemented

✅ Google Sign-In authentication  
✅ Phone OTP authentication  
✅ User profile management in database  
✅ Protected routes for KYC flow  
✅ Automatic user creation on first sign-in  
✅ Session management  
✅ Sign-out functionality  

## API Endpoints

- `POST /api/auth/verify` - Verify Firebase token
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- All KYC endpoints now require authentication

## Next Steps

1. Test the authentication flow
2. Customize the UI if needed
3. Set up production environment
4. Configure monitoring and logging
5. Add additional security measures as needed
