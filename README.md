# 🆔 Armith - Multi-Country Identity Verification API

Armith is a production-ready, open-source KYC (Know Your Customer) API system that verifies identity documents and selfies using **Groq's Llama 4 Scout (17Bx16E)** Vision Language Model. Built with Express.js backend and React frontend with ShadCN UI.

## Documentation

Product guides (flows, architecture, operations) and an **interactive OpenAPI** reference (Scalar) live in the VitePress site under [`frontend/docs/`](frontend/docs/).

```bash
cd frontend/docs && npm install   # first time, or use npm run install-all from repo root
npm run docs:dev                  # local dev server (default http://localhost:5173)
npm run docs:build                # static output in frontend/docs/.vitepress/dist
npm run docs:preview              # preview production build
```

From the repo root you can also run `npm run docs:dev` / `npm run docs:build` / `npm run docs:preview`.

After `npm run docs:build` (or when you start the frontend with `npm start` / root `npm run dev`, which runs `prestart`), the docs are emitted to **`frontend/public/docs`** and are available in the browser at **`http://localhost:3000/docs/`** alongside the SPA. Use the **Documentation** link in the app header.

![Armith](https://img.shields.io/badge/Status-Production%20Ready-green)
![License](https://img.shields.io/badge/License-MIT-blue)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![React](https://img.shields.io/badge/React-18-blue)

## ✨ Features

### 🔍 **AI-Powered Verification**
- **Groq Llama 4 Scout Integration** - Advanced Vision Language Model (VLM) for document and face analysis
- **Multi-Country Support** - Turkey (TR), United States (US), United Kingdom (GB), and more
- **Real-time Processing** - Get verification results in seconds

### 🛡️ **Enterprise Security**
- **AWS S3 Integration** - Secure image storage with presigned URLs
- **Field-level Validation** - Comprehensive error codes and rejection reasons
- **Rate Limiting** - Built-in protection against abuse
- **HTTPS Only** - Secure image handling, no base64 transfers

### 🎯 **Production Features**
- **Standardized API** - Consistent JSON responses across all endpoints
- **Status Management** - `approved`, `rejected`, `failed`, `pending` states
- **Retry Mechanism** - Automatic handling of malformed AI responses
- **Admin Dashboard** - Monitor and manage all verifications
- **Modular Architecture** - Easy to extend and customize

## 🏗️ Architecture

```
armith/
├── backend/                 # Express.js API Server (MVC Architecture)
│   ├── controllers/        # Route handlers and business logic
│   │   ├── healthController.js
│   │   ├── kycController.js
│   │   └── adminController.js
│   ├── routes/             # API route definitions
│   │   ├── healthRoutes.js
│   │   ├── kycRoutes.js
│   │   ├── adminRoutes.js
│   │   └── index.js
│   ├── utils/              # Shared utilities
│   │   └── database.js
│   ├── app.js              # Main Express application
│   ├── error-codes.js      # Error code registry
│   ├── schemas.js          # Zod validation schemas
│   ├── prompts.js          # Country-specific AI prompts
│   ├── storage.js          # AWS S3 utilities
│   └── db.json            # JSON database (migrate to MongoDB later)
├── frontend/               # React + ShadCN UI
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Main application pages
│   │   ├── services/       # API service layer
│   │   └── lib/            # Utility functions
└── package.json           # Monorepo scripts
```

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **DeepSeek API Key** (from https://platform.deepseek.com)
- **AWS Account** (S3 bucket for image storage)

### 1. Clone & Install

```bash
git clone <repository-url>
cd armith

# Install dependencies for both backend and frontend
npm run install:all
```

### 2. Environment Configuration

#### Backend Environment (`backend/.env`)

```bash
# Copy example and configure
cp backend/env.example backend/.env
```

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# DeepSeek Configuration
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=us-east-1
AWS_S3_BUCKET=armith-images

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

#### Frontend Environment (`frontend/.env`)

```env
REACT_APP_API_URL=http://localhost:3001
```

### 3. AWS S3 Setup

1. Create an S3 bucket for image storage
2. Configure bucket CORS policy:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["http://localhost:3000", "your-domain.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### 4. Run Development

```bash
# Start both backend and frontend
npm run dev

# Or run separately
npm run backend:dev  # Backend on port 3001
npm run frontend:dev # Frontend on port 3000
```

Visit `http://localhost:3000` to see the application.

## 📋 API Reference

### Base URL
```
http://localhost:3001
```

### Endpoints

#### 🆔 ID Verification
```http
POST /kyc/id-check
```

**Request:**
```json
{
  "countryCode": "tr",
  "frontImageUrl": "https://your-s3-bucket.amazonaws.com/front.jpg",
  "backImageUrl": "https://your-s3-bucket.amazonaws.com/back.jpg"
}
```

**Response:**
```json
{
  "status": "approved", // or "rejected", "failed", "pending"
  "data": {
    "fullName": "John Doe",
    "identityNumber": "1234567890",
    "dateOfBirth": "1990-01-01",
    "expiryDate": "2030-01-01",
    "gender": "M",
    "nationality": "TR",
    "serialNumber": "A123456",
    "mrz": "...",
    "address": "..."
  },
  "errors": [
    {
      "code": "MISSING_SERIAL_NUMBER",
      "message": "Serial number could not be detected on ID card."
    }
  ],
  "rejectionReasons": [
    "Key fields are missing"
  ],
  "userId": "uuid"
}
```

#### 🤳 Selfie Verification
```http
POST /kyc/selfie-check
```

**Request:**
```json
{
  "idPhotoUrl": "https://your-s3-bucket.amazonaws.com/id.jpg",
  "selfieUrls": [
    "https://your-s3-bucket.amazonaws.com/selfie1.jpg",
    "https://your-s3-bucket.amazonaws.com/selfie2.jpg"
  ]
}
```

**Response:**
```json
{
  "status": "approved",
  "matchConfidence": "91%",
  "isMatch": true,
  "spoofingRisk": false,
  "imageQualityIssues": [],
  "errors": [],
  "rejectionReasons": []
}
```

#### 📤 Upload URL Generation
```http
POST /kyc/upload-url
```

**Request:**
```json
{
  "fileType": "image/jpeg"
}
```

**Response:**
```json
{
  "success": true,
  "uploadUrl": "https://s3.amazonaws.com/presigned-upload-url",
  "downloadUrl": "https://s3.amazonaws.com/download-url",
  "key": "uploads/timestamp-uuid",
  "expiresIn": 300
}
```

### Additional Endpoints

- `GET /health` - Health check
- `GET /kyc/countries` - Supported countries
- `GET /kyc/status/:userId` - Get verification status
- `GET /admin/verifications` - Admin: List all verifications

## 🎨 Frontend Pages

1. **HomePage** (`/`) - Welcome screen and process overview
2. **UploadIdPage** (`/upload-id`) - ID document upload interface
3. **UploadSelfiePage** (`/upload-selfie`) - Selfie capture interface
4. **ResultPage** (`/result/:userId`) - Verification results display
5. **AdminPage** (`/admin`) - Admin dashboard for monitoring

## 🔧 Configuration

### Supported Countries

Currently supported countries and their document types:

| Country | Code | Document Type | Status |
|---------|------|---------------|---------|
| Turkey | `tr` | Republic ID Card | ✅ Active |
| United States | `us` | Driver License / State ID | ✅ Active |
| United Kingdom | `gb` | Driving Licence | ✅ Active |

### Error Codes

#### ID Verification Errors
- `MISSING_FULL_NAME` - Full name not detected
- `MISSING_IDENTITY_NUMBER` - Identity number missing
- `MISSING_DOB` - Date of birth not found
- `EXPIRED_ID` - ID card has expired
- `BLURRY_IMAGE` - Image quality insufficient

#### Selfie Verification Errors
- `LOW_MATCH_CONFIDENCE` - Face match below threshold
- `NO_FACE_DETECTED` - No face found in image
- `SPOOFING_DETECTED` - Potential fake image detected
- `POOR_IMAGE_QUALITY` - Image quality too poor

#### System Errors
- `GROQ_API_ERROR` - AI service error
- `INVALID_JSON_RESPONSE` - Malformed AI response
- `RATE_LIMIT_EXCEEDED` - Too many requests

## 🛠️ Development

### Adding New Countries

1. **Add country prompt** in `backend/prompts.js`:
```javascript
fr: {
  name: 'French National ID',
  prompt: `You are verifying a French National ID card...`
}
```

2. **Update supported countries list**
3. **Test with sample documents**

### Database Migration

The system currently uses JSON file storage (`backend/db.json`). To migrate to MongoDB:

1. Install MongoDB driver: `npm install mongodb`
2. Replace database functions in `backend/app.js`
3. Update connection string in environment variables

### Extending AI Prompts

Prompts are modular and country-specific. Each prompt should:
- Request specific JSON format
- Include validation instructions  
- Specify error conditions
- Handle edge cases

## 🚀 Production Deployment

### Backend Deployment

1. **Environment Variables**
```bash
NODE_ENV=production
PORT=80
OPENAI_API_KEY=prod_key
AWS_ACCESS_KEY_ID=prod_key
AWS_SECRET_ACCESS_KEY=prod_secret
```

2. **Process Manager**
```bash
npm install -g pm2
pm2 start backend/app.js --name armith-api
```

3. **Reverse Proxy** (Nginx)
```nginx
server {
    listen 80;
    server_name api.your-domain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Frontend Deployment

1. **Build**
```bash
cd frontend
npm run build
```

2. **Deploy** to Vercel, Netlify, or serve with nginx

### Security Considerations

- Use HTTPS in production
- Set up proper CORS origins
- Implement authentication for admin routes
- Monitor API usage and set appropriate rate limits
- Regularly rotate AWS keys
- Keep OpenAI API key secure

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Add proper error handling
- Include unit tests for new features
- Update documentation
- Follow semantic versioning

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for GPT-4o multimodal capabilities
- **AWS** for secure cloud storage
- **ShadCN UI** for beautiful React components
- **Zod** for runtime type validation

## 📞 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Open GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub Discussions for questions

---

Built with ❤️ for secure, scalable identity verification. 