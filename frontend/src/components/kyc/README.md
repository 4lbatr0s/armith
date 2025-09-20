# Test KYC Flow Components

This directory contains components for the test KYC verification flow (`/test-kyc-flow`).

## Components

### `TestKYCFlow.jsx`
Main component that orchestrates the 2-step verification process:
1. ID Card verification
2. Selfie verification

### `StatusTracker.jsx`
Visual progress indicator showing the current step and status of each verification step.

### `IDCardStep.jsx`
Handles ID card upload and verification:
- Upload front image (required)
- Upload back image (optional)
- Submit for AI verification
- Only allows progression to selfie step on success

### `SelfieStep.jsx`
Handles selfie capture and verification:
- Camera capture option
- File upload option
- Multiple image support
- AI verification against ID photo

## Flow Requirements

✅ **Step 1 (ID Card)**:
- Upload front image (required)
- Upload back image (optional)
- Verify with AI
- Must succeed before proceeding to step 2

✅ **Step 2 (Selfie)**:
- Camera capture OR file upload
- Multiple images supported
- Verify against ID photo
- Show final results

✅ **Status Tracking**:
- Visual progress indicator
- Success/failure status for each step
- Prevents skipping steps

✅ **Navigation**:
- Updated from "Verify ID" to "Test KYC"
- Links to `/test-kyc-flow` route
- Reset functionality for new verifications

## Usage

Navigate to `/test-kyc-flow` to start the test verification process.
