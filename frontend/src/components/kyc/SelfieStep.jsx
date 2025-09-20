import React, { useState, useRef } from 'react';
import { apiService } from '../../services/api';

export const SelfieStep = ({ onComplete, status, idCardData }) => {
  const [captureMode, setCaptureMode] = useState('camera'); // 'camera' or 'upload'
  const [capturedImages, setCapturedImages] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Camera error:', error);
      setError('Unable to access camera. Please use file upload instead.');
      setCaptureMode('upload');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setCapturedImages(prev => [...prev, file]);
        }
      }, 'image/jpeg', 0.8);
    }
  };

  const handleFileUpload = async (file) => {
    try {
      setIsUploading(true);
      setError(null);
      
      // Get upload URL
      const uploadData = await apiService.generateUploadUrl(file.type);
      
      // Upload file using local method
      const uploadResponse = await apiService.uploadFileLocal(file, uploadData.uploadUrl);
      
      setImageUrls(prev => [...prev, uploadResponse.downloadUrl]);
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleVerify = async () => {
    const allImages = [...capturedImages, ...imageUrls];
    
    if (allImages.length === 0) {
      setError('Please capture or upload at least one selfie image');
      return;
    }

    if (!idCardData?.frontImageUrl) {
      setError('ID card data is missing. Please go back and verify your ID first.');
      return;
    }

    try {
      setIsVerifying(true);
      setError(null);

      // Upload captured images if any
      const uploadedUrls = [...imageUrls];
      
      for (const image of capturedImages) {
        const uploadData = await apiService.generateUploadUrl(image.type);
        
        // Upload file using local method
        const uploadResponse = await apiService.uploadFileLocal(image, uploadData.uploadUrl);
        
        uploadedUrls.push(uploadResponse.downloadUrl);
      }

      const request = {
        idPhotoUrl: idCardData.frontImageUrl,
      
        selfieUrls: uploadedUrls
      };

      const result = await apiService.verifySelfie(request);
      
      onComplete(result, result.status === 'approved' ? 'success' : 'failed');
    } catch (error) {
      console.error('Verification error:', error);
      setError('Verification failed. Please try again.');
      onComplete(null, 'failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const removeImage = (index, type) => {
    if (type === 'captured') {
      setCapturedImages(prev => prev.filter((_, i) => i !== index));
    } else {
      setImageUrls(prev => prev.filter((_, i) => i !== index));
    }
  };

  const canVerify = (capturedImages.length > 0 || imageUrls.length > 0) && !isUploading && !isVerifying;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        Step 2: Selfie Verification
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Capture Mode Selection */}
      <div className="mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => {
              setCaptureMode('camera');
              if (captureMode !== 'camera') {
                stopCamera();
              }
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              captureMode === 'camera'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📷 Take Photo
          </button>
          <button
            onClick={() => {
              setCaptureMode('upload');
              stopCamera();
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              captureMode === 'upload'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📁 Upload Photo
          </button>
        </div>
      </div>

      {/* Camera Mode */}
      {captureMode === 'camera' && (
        <div className="mb-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="text-center">
              {stream ? (
                <div>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="max-w-full h-64 mx-auto mb-4 rounded-lg"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="space-x-4">
                    <button
                      onClick={capturePhoto}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      📸 Capture Photo
                    </button>
                    <button
                      onClick={stopCamera}
                      className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Stop Camera
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 mb-3">Start camera to take a selfie</p>
                  <button
                    onClick={startCamera}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Start Camera
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Mode */}
      {captureMode === 'upload' && (
        <div className="mb-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-gray-600 mb-3">Upload selfie image</p>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) handleFileUpload(file);
              }}
              disabled={isUploading}
              className="hidden"
              id="selfie-upload"
            />
            <label
              htmlFor="selfie-upload"
              className={`inline-block px-4 py-2 rounded-lg cursor-pointer ${
                isUploading 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } transition-colors`}
            >
              {isUploading ? 'Uploading...' : 'Choose File'}
            </label>
          </div>
        </div>
      )}

      {/* Captured/Uploaded Images */}
      {(capturedImages.length > 0 || imageUrls.length > 0) && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Selfie Images</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {capturedImages.map((image, index) => (
              <div key={`captured-${index}`} className="relative">
                <img
                  src={URL.createObjectURL(image)}
                  alt={`Captured ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  onClick={() => removeImage(index, 'captured')}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}
            {imageUrls.map((url, index) => (
              <div key={`uploaded-${index}`} className="relative">
                <img
                  src={url}
                  alt={`Uploaded ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  onClick={() => removeImage(index, 'uploaded')}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
          {isVerifying ? 'Verifying...' : 'Verify Selfie'}
        </button>
      </div>
    </div>
  );
};
