# 🛠️ KYC Flow Setup Guide

This guide will walk you through setting up the complete KYC Flow system from scratch.

## 📁 Project Structure

```
kyc-flow/
├── backend/                    # Express.js API Server
│   ├── package.json           # Backend dependencies
│   ├── app.js                 # Main Express application
│   ├── error-codes.js         # Error code definitions
│   ├── schemas.js             # Zod validation schemas
│   ├── prompts.js             # AI prompts for different countries
│   ├── storage.js             # AWS S3 integration
│   ├── db.json               # JSON file database
│   └── env.example           # Environment variables template
├── frontend/                  # React + TypeScript + ShadCN UI
│   ├── public/
│   │   └── index.html        # HTML template
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── ui/          # ShadCN UI components
│   │   │   └── Layout.tsx   # Main layout component
│   │   ├── pages/           # Main application pages
│   │   │   ├── HomePage.tsx
│   │   │   ├── UploadIdPage.tsx
│   │   │   ├── UploadSelfiePage.tsx
│   │   │   ├── ResultPage.tsx
│   │   │   └── AdminPage.tsx
│   │   ├── services/        # API service layer
│   │   │   └── api.ts
│   │   ├── types/           # TypeScript type definitions
│   │   │   └── api.ts
│   │   ├── lib/             # Utility functions
│   │   │   └── utils.ts
│   │   ├── App.tsx          # Main React app component
│   │   ├── index.tsx        # React entry point
│   │   └── index.css        # Global styles
│   ├── package.json         # Frontend dependencies
│   ├── tailwind.config.js   # Tailwind CSS configuration
│   ├── postcss.config.js    # PostCSS configuration
│   └── tsconfig.json        # TypeScript configuration
├── package.json             # Monorepo scripts
├── README.md               # Project documentation
└── SETUP.md                # This setup guide
```

## 🚀 Step-by-Step Setup

### Step 1: System Requirements

Ensure you have the following installed:

```bash
# Check Node.js version (18+ required)
node --version

# Check npm version
npm --version

# If Node.js is not installed, download from https://nodejs.org/
```

### Step 2: Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd kyc-flow

# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

### Step 3: Set Up Environment Variables

#### 3.1 Backend Environment

```bash
# Copy the example environment file
cp backend/env.example backend/.env

# Edit the environment file
nano backend/.env  # or use your preferred editor
```

Configure the following variables in `backend/.env`:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# DeepSeek Configuration (REQUIRED)
DEEPSEEK_API_KEY=your-deepseek-api-key-here

# AWS S3 Configuration (REQUIRED)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-kyc-bucket-name

# Rate Limiting (Optional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

#### 3.2 Frontend Environment

```bash
# Create frontend environment file
echo "REACT_APP_API_URL=http://localhost:3001" > frontend/.env
```

### Step 4: Set Up DeepSeek API

1. **Get DeepSeek API Key**:
   - Visit [DeepSeek Platform](https://platform.deepseek.com/)
   - Create an account or sign in
   - Navigate to API Keys section
   - Create a new API key
   - **Note**: DeepSeek provides cost-effective AI with advanced reasoning capabilities

2. **Add to Environment**:
   ```bash
   # In backend/.env
   DEEPSEEK_API_KEY=your-actual-deepseek-api-key-here
   ```

### Step 5: Set Up AWS S3

#### 5.1 Create S3 Bucket

```bash
# Using AWS CLI (if installed)
aws s3 mb s3://your-kyc-bucket-name --region us-east-1

# Or create through AWS Console:
# 1. Go to AWS S3 Console
# 2. Click "Create bucket"
# 3. Enter bucket name (e.g., "kyc-flow-images-yourname")
# 4. Select region (us-east-1 recommended)
# 5. Keep default settings for now
# 6. Click "Create bucket"
```

#### 5.2 Configure CORS Policy

In AWS S3 Console, go to your bucket → Permissions → CORS:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://your-domain.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

#### 5.3 Create IAM User for S3 Access

1. **Go to AWS IAM Console**
2. **Create User**:
   - User name: `kyc-flow-s3-user`
   - Access type: Programmatic access
3. **Attach Policy**:
   - Create custom policy or use `AmazonS3FullAccess` (for development)
   - For production, use more restrictive policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:GetObjectAcl",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::your-kyc-bucket-name/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::your-kyc-bucket-name"
    }
  ]
}
```

4. **Save Credentials**:
   - Copy Access Key ID and Secret Access Key
   - Add to `backend/.env`

### Step 6: Initialize Database

The system uses a JSON file database by default:

```bash
# The db.json file is already created with initial structure
# No additional setup needed for development

# For production, consider migrating to MongoDB:
# 1. Install MongoDB
# 2. Update backend/app.js database functions
# 3. Add MONGODB_URI to environment variables
```

### Step 7: Start Development Servers

#### Option 1: Start Both Servers Together

```bash
# From root directory
npm run dev
```

This will start:
- Backend API server on `http://localhost:3001`
- Frontend React app on `http://localhost:3000`

#### Option 2: Start Servers Separately

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 8: Verify Setup

#### 8.1 Test Backend API

```bash
# Health check
curl http://localhost:3001/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2024-01-01T12:00:00.000Z",
#   "version": "1.0.0"
# }

# Get supported countries
curl http://localhost:3001/kyc/countries

# Expected response:
# {
#   "supportedCountries": ["tr", "us", "gb"],
#   "message": "List of supported country codes for ID verification"
# }
```

#### 8.2 Test Frontend

1. **Open Browser**: Navigate to `http://localhost:3000`
2. **Check Pages**:
   - Home page should load with KYC Flow branding
   - Navigation should work (Home, Verify ID, Admin)
   - No console errors in browser developer tools

#### 8.3 Test File Upload

```bash
# Test presigned URL generation
curl -X POST http://localhost:3001/kyc/upload-url \
  -H "Content-Type: application/json" \
  -d '{"fileType": "image/jpeg"}'

# Should return upload URL, download URL, and key
```

## 🔧 Development Workflow

### Adding New Countries

1. **Add prompts** in `backend/prompts.js`:
```javascript
// Add new country configuration
de: {
  name: 'German ID Card',
  prompt: `You are verifying a German ID card...`
}
```

2. **Test with sample documents**
3. **Update documentation**

### Making API Changes

1. **Update schemas** in `backend/schemas.js` if needed
2. **Update TypeScript types** in `frontend/src/types/api.ts`
3. **Update API service** in `frontend/src/services/api.ts`
4. **Test all endpoints**

### Frontend Development

1. **Component Structure**: Follow ShadCN UI patterns
2. **State Management**: Use React hooks (useState, useEffect)
3. **API Integration**: Use the centralized API service
4. **Styling**: Use Tailwind CSS classes

## 🚨 Troubleshooting

### Common Issues

#### Backend Won't Start

**Error**: `Error: Cannot find module 'dotenv'`
```bash
cd backend
npm install
```

**Error**: `OpenAI API key not configured`
```bash
# Check backend/.env file exists and has OPENAI_API_KEY
cat backend/.env | grep OPENAI_API_KEY
```

#### Frontend Build Issues

**Error**: `Module not found: Can't resolve 'react'`
```bash
cd frontend
npm install
```

**Error**: `Cannot find module '@/components/ui/button'`
```bash
# The UI components need to be built or installed
# For now, components are created as needed
```

#### AWS S3 Issues

**Error**: `Access Denied` when uploading
```bash
# Check IAM user permissions
# Verify bucket CORS configuration
# Ensure AWS credentials are correct in backend/.env
```

#### Database Issues

**Error**: `ENOENT: no such file or directory, open 'db.json'`
```bash
# Ensure db.json exists in backend/
cd backend
ls -la db.json

# If missing, create it:
echo '{"users":[],"metadata":{"version":"1.0.0","createdAt":"2024-01-01T00:00:00.000Z"}}' > db.json
```

### Debug Mode

Enable debug logging:

```bash
# Backend debug mode
cd backend
DEBUG=* npm run dev

# Check API responses
# Enable browser developer tools
# Monitor network tab for API calls
```

## 📝 Next Steps

Once setup is complete:

1. **Test ID Verification**: Upload sample ID documents
2. **Test Selfie Matching**: Try the selfie verification flow
3. **Check Admin Panel**: View verification results
4. **Customize**: Modify prompts, add countries, enhance UI
5. **Deploy**: Follow production deployment guide in README.md

## 🔒 Security Notes

- **Never commit `.env` files** to version control
- **Rotate API keys** regularly
- **Use IAM roles** in production instead of IAM users
- **Enable CloudTrail** for AWS API logging
- **Set up monitoring** for unusual API usage

## 📞 Getting Help

If you encounter issues:

1. **Check logs**: Backend console and browser developer tools
2. **Verify environment**: Double-check all environment variables
3. **Test connectivity**: Ensure OpenAI and AWS are accessible
4. **Review documentation**: Check README.md for additional details
5. **Open issue**: Create GitHub issue with detailed error information

---

Happy coding! 🚀✨ 