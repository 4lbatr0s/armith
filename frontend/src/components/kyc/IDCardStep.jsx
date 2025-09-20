import React, { useState } from 'react';
import { apiService } from '../../services/api';

export const IDCardStep = ({ onComplete, status }) => {
  const [, setFrontImage] = useState(null);
  const [, setBackImage] = useState(null);
  const [frontImageUrl, setFrontImageUrl] = useState(null);
  const [backImageUrl, setBackImageUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);

  const handleImageUpload = async (file, type) => {
    try {
      setIsUploading(true);
      setError(null);
      
      // Get upload URL
      const uploadData = await apiService.generateUploadUrl(file.type);
      
      // Upload file using local method
      const uploadResponse = await apiService.uploadFileLocal(file, uploadData.uploadUrl);
      
      // Set the image data using the actual upload response
      if (type === 'front') {
        setFrontImage(file);
        setFrontImageUrl(uploadResponse.downloadUrl);
      } else {
        setBackImage(file);
        setBackImageUrl(uploadResponse.downloadUrl);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleVerify = async () => {
    if (!frontImageUrl) {
      setError('Please upload the front of your ID card');
      return;
    }

    try {
      setIsVerifying(true);
      setError(null);

      const request = {
        countryCode: 'tr', // Default to Turkey for testing
        frontImageUrl: frontImageUrl,
        backImageUrl: backImageUrl // Optional
      };

      const result = await apiService.verifyId(request);
      
      onComplete(result, result.status === 'approved' ? 'success' : 'failed');
    } catch (error) {
      console.error('Verification error:', error);
      setError('Verification failed. Please try again.');
      onComplete(null, 'failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const canVerify = frontImageUrl && !isUploading && !isVerifying;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        Step 1: Upload ID Card
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Front Image */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Front of ID Card
          </h3>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            {frontImageUrl ? (
              <div>
                <img 
                  src={frontImageUrl} 
                  alt="Front of ID" 
                  className="max-w-full h-48 object-contain mx-auto mb-3 rounded-lg"
                />
                <p className="text-sm text-green-600 font-medium">
                  ✓ Front image uploaded
                </p>
                <button
                  onClick={() => {
                    setFrontImage(null);
                    setFrontImageUrl(null);
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <p className="text-gray-600 mb-3">Upload front image</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) handleImageUpload(file, 'front');
                  }}
                  disabled={isUploading}
                  className="hidden"
                  id="front-upload"
                />
                <label
                  htmlFor="front-upload"
                  className={`inline-block px-4 py-2 rounded-lg cursor-pointer ${
                    isUploading 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } transition-colors`}
                >
                  {isUploading ? 'Uploading...' : 'Choose File'}
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Back Image */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Back of ID Card <span className="text-sm text-gray-500">(Optional)</span>
          </h3>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            {backImageUrl ? (
              <div>
                <img 
                  src={backImageUrl} 
                  alt="Back of ID" 
                  className="max-w-full h-48 object-contain mx-auto mb-3 rounded-lg"
                />
                <p className="text-sm text-green-600 font-medium">
                  ✓ Back image uploaded
                </p>
                <button
                  onClick={() => {
                    setBackImage(null);
                    setBackImageUrl(null);
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <p className="text-gray-600 mb-3">Upload back image</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) handleImageUpload(file, 'back');
                  }}
                  disabled={isUploading}
                  className="hidden"
                  id="back-upload"
                />
                <label
                  htmlFor="back-upload"
                  className={`inline-block px-4 py-2 rounded-lg cursor-pointer ${
                    isUploading 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } transition-colors`}
                >
                  {isUploading ? 'Uploading...' : 'Choose File'}
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verify Button */}
      <div className="text-center">
        <button
          onClick={handleVerify}
          disabled={!canVerify}
          className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
            canVerify
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isVerifying ? 'Verifying...' : 'Verify ID Card'}
        </button>
      </div>
    </div>
  );
};
