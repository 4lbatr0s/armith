# KYC Flow API 🔐

A production-ready, multi-country KYC (Know Your Customer) API that verifies identity documents and selfies using LLMs (OpenAI GPT-4o). Built for open-source contribution and API-first design.

## 🌟 Features

- **Multi-Country Support**: Configurable ID verification for different countries
- **Document Verification**: Extract and validate ID card data from front/back images
- **Selfie Matching**: Face verification with spoofing detection
- **Standardized API**: Consistent JSON responses with detailed error codes
- **Field-Level Validation**: Granular error reporting for each data field
- **Retry Mechanism**: Automatic retry for malformed LLM responses
- **AWS S3 Integration**: Secure image storage with presigned URLs
- **Modern UI**: React frontend with ShadCN components

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- AWS Account (for S3 storage)
- OpenAI API Key

### Installation

```bash
# Clone and install dependencies
git clone <repository-url>
cd kyc-flow
npm run install:all

# Set up environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys
```

### Environment Variables

```bash
# backend/.env
OPENAI_API_KEY=your_openai_api_key
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-kyc-bucket
PORT=3001
```

### Running the Application

```bash
# Start both backend and frontend
npm run dev

# Or run separately
npm run backend:dev  # Backend on http://localhost:3001
npm run frontend:dev # Frontend on http://localhost:3000
```

## 📡 API Documentation

### POST /kyc/id-check

Verifies ID card images and extracts identity data.

**Request:**
```json
{
  "countryCode": "tr",
  "frontImageUrl": "https://example.com/id_front.jpg",
  "backImageUrl": "https://example.com/id_back.jpg"
}
```

**Response:**
```json
{
  "status": "approved",
  "data": {
    "fullName": "John Doe",
    "identityNumber": "1234567890",
    "dateOfBirth": "1990-01-01",
    "expiryDate": "2030-01-01",
    "gender": "M",
    "nationality": "TR",
    "serialNumber": "AB123456",
    "mrz": "",
    "address": "123 Main St"
  },
  "errors": [],
  "rejectionReasons": []
}
```

### POST /kyc/selfie-check

Matches ID face with selfies and detects spoofing.

**Request:**
```json
{
  "idPhotoUrl": "https://example.com/id.jpg",
  "selfieUrls": [
    "https://example.com/selfie1.jpg",
    "https://example.com/selfie2.jpg"
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

### GET /storage/presigned-url

Get presigned URL for secure image upload.

**Query Parameters:**
- `filename`: Name of the file to upload
- `contentType`: MIME type of the file

## 🏗️ Architecture

```
kyc-flow/
├── backend/
│   ├── app.js              # Express server
│   ├── prompts.js          # LLM prompts
│   ├── schemas.js          # Zod validation schemas
│   ├── error-codes.js      # Error code registry
│   ├── storage.js          # AWS S3 integration
│   └── db.json             # JSON database (temporary)
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   └── lib/            # Utilities
│   └── public/
└── docs/                   # Additional documentation
```

## 🔧 Status Codes

- `approved`: All validations passed
- `rejected`: Failed validation with specific reasons
- `failed`: Technical error or malformed data
- `pending`: Processing in progress

## 🛠️ Error Codes

| Code | Description |
|------|-------------|
| `MISSING_FULL_NAME` | Full name not found or unreadable |
| `INVALID_DOB_FORMAT` | Date of birth format is invalid |
| `MISSING_IDENTITY_NUMBER` | Identity number not detected |
| `EXPIRED_DOCUMENT` | Document has expired |
| `LOW_IMAGE_QUALITY` | Image is too blurry or unclear |
| `FACE_MISMATCH` | Selfie doesn't match ID photo |
| `SPOOFING_DETECTED` | Potential spoofing attempt detected |

## 🌍 Supported Countries

- 🇹🇷 Turkey (tr)
- 🇺🇸 United States (us)
- 🇬🇧 United Kingdom (gb)
- 🇩🇪 Germany (de)
- More countries can be added via prompts.js

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Adding New Countries

1. Add country-specific prompts in `backend/prompts.js`
2. Update the country list in documentation
3. Test with sample documents

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔒 Security

- Never commit API keys or sensitive data
- Use presigned URLs for image uploads
- Implement rate limiting in production
- Regular security audits recommended

## 📞 Support

- Create an issue for bug reports
- Discussions for feature requests
- Email: support@yourcompany.com 