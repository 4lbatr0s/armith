import React, { useState, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { apiService } from '../services/api';
import { Button } from '../components/ui/button';

import { useTranslation } from 'react-i18next';

export const UploadSelfiePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDemoMode = searchParams.get('mode') === 'demo';
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
      await apiService.verifySelfie({
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
      const limitError = err?.code === 'PLAN_LIMIT_REACHED'
        ? t('upload_id.plan_limit_reached')
        : null;
      setError(limitError || err.message || t('common.error'));
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
    <div className="flex-1 w-full py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <span className="pm-kicker mb-3 inline-block text-[10px]">{t('layout.verify_identity')}</span>
          <h1 className="font-display text-3xl font-bold tracking-tight">{t('upload_selfie.title')}</h1>
          <p className="mt-2 text-sm text-pm-muted max-w-lg">{t('upload_selfie.subtitle')}</p>
          {isDemoMode && (
            <div className="mt-3 rounded-sm border-2 border-pm-accent/40 bg-pm-accent/10 px-3 py-2 text-xs max-w-lg">
              {t('upload_id.demo_mode_notice')}
            </div>
          )}
        </div>

        <div className="pm-panel overflow-hidden transition-colors duration-200">
          <div className="p-6 sm:p-8">
            {error && (
              <div className="mb-6 border-2 border-red-600/40 bg-red-500/10 text-red-800 dark:text-red-200 px-4 py-3 text-sm rounded-sm" role="alert">
                <span className="block sm:inline">{error}</span>
                {error === t('upload_id.plan_limit_reached') && (
                  <div className="mt-3">
                    <Link to="/pricing" className="underline font-semibold">
                      {t('upload_id.upgrade_cta')}
                    </Link>
                  </div>
                )}
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
                        <div className="w-8 h-8 rounded-full border-4 border-pm-accent"></div>
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
                  <div className="h-96 w-full bg-pm-wash/40 dark:bg-pm-void/80 rounded-sm flex flex-col items-center justify-center border-2 border-dashed border-pm-ink/15 dark:border-white/15">
                    <svg className="h-24 w-24 text-pm-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <div className="space-x-4">
                      <Button onClick={startCamera} className="shadow-brutal border-2 border-pm-ink dark:border-white/20">
                        {t('upload_selfie.use_camera')}
                      </Button>
                      <span className="text-pm-muted text-xs font-bold uppercase tracking-widest">{t('common.or')}</span>
                      <label className="cursor-pointer py-2 px-4 border-2 border-pm-ink/20 dark:border-white/20 rounded-sm text-xs font-bold uppercase tracking-wider text-pm-ink dark:text-pm-ink-soft hover:bg-pm-wash/60 dark:hover:bg-white/10 inline-flex items-center">
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
                  className="w-full flex justify-center py-3 shadow-brutal border-2 border-pm-ink dark:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
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