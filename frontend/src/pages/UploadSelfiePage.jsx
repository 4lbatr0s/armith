import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { apiService } from '../services/api';
import { Button } from '../components/ui/button';

import { useTranslation } from 'react-i18next';

export const UploadSelfiePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('select'); // 'select', 'camera', 'upload'

  const [selfieFile, setSelfieFile] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);

  // Start Camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setMode('camera');
      setError(null);
    } catch (err) {
      console.error('Camera error:', err);
      setError('Could not access camera. Please try uploading a file instead.');
    }
  };

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Capture Photo
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
        setSelfieFile(file);
        setSelfiePreview(URL.createObjectURL(file));
        stopCamera();
        setMode('preview');
      }, 'image/jpeg', 0.9);
    }
  };

  // Handle File Upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelfieFile(file);
    setSelfiePreview(URL.createObjectURL(file));
    setMode('preview');
  };

  // Submit Verification
  const handleSubmit = async () => {
    if (!selfieFile) {
      setError(t('upload_selfie.error_no_file'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userId = user?.id;
      
      // 1. Upload Selfie
      const uploadData = await apiService.generateUploadUrl(selfieFile.type, userId, 'selfie');
      await apiService.uploadFile(selfieFile, uploadData.uploadUrl);

      // 2. Get ID photo URL and verification ID from previous step
      const idPhotoUrl = localStorage.getItem('idPhotoUrl');
      const verificationId = localStorage.getItem('currentVerificationId');
      
      if (!idPhotoUrl) {
        setError(t('upload_selfie.error_id_not_found') || 'ID photo not found. Please go back and upload your ID first.');
        setIsLoading(false);
        return;
      }

      // 3. Verify Selfie (with profileId to save to database)
      const selfieResult = await apiService.verifySelfie({
        idPhotoUrl: idPhotoUrl,
        selfieUrls: [uploadData.downloadUrl],
        profileId: verificationId // This is actually profileId from localStorage
      });

      // 4. Navigate to result page with verification ID
      // Clear temporary localStorage items
      localStorage.removeItem('idPhotoUrl');
      localStorage.removeItem('idVerificationResult');
      
      // Navigate to result page with the verification ID
      navigate(`/result/${verificationId}`);

    } catch (err) {
      console.error('Verification failed:', err);
      setError(err.message || t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('upload_selfie.title')}</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{t('upload_selfie.subtitle')}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl overflow-hidden transition-colors duration-200">
          <div className="p-8">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            <div className="space-y-8">
              {/* Camera/Preview Area */}
              <div className="flex justify-center">
                {mode === 'camera' ? (
                  <div className="relative rounded-lg overflow-hidden bg-black">
                    <video ref={videoRef} autoPlay playsInline className="h-96 w-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
                      <button
                        onClick={capturePhoto}
                        className="bg-white rounded-full p-4 shadow-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full border-4 border-blue-600"></div>
                      </button>
                      <button
                        onClick={() => { stopCamera(); setMode('select'); }}
                        className="bg-red-500 text-white rounded-full p-3 shadow-lg hover:bg-red-600 transition-colors"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                ) : selfiePreview ? (
                  <div className="relative">
                    <img src={selfiePreview} alt="Selfie Preview" className="h-96 w-full object-cover rounded-lg" />
                    <button
                      onClick={() => { setSelfieFile(null); setSelfiePreview(null); setMode('select'); }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ) : (
                  <div className="h-96 w-full bg-gray-100 dark:bg-gray-700 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <svg className="h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <div className="space-x-4">
                      <Button onClick={startCamera} className="bg-blue-600 hover:bg-blue-700 text-white">
                        {t('upload_selfie.use_camera')}
                      </Button>
                      <span className="text-gray-500 dark:text-gray-400">{t('common.or')}</span>
                      <label className="cursor-pointer bg-white dark:bg-gray-800 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 inline-flex items-center">
                        {t('upload_selfie.upload_photo')}
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <Button
                  onClick={handleSubmit}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading || !selfieFile}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('upload_selfie.verifying')}
                    </>
                  ) : (
                    t('upload_selfie.complete_verification')
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};