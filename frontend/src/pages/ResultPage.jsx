import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';

export const ResultPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userId } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        
        if (userId) {
          const data = await apiService.getUserStatus(userId);
          setResult(data);
        } else {
          const storedResult = localStorage.getItem('verificationResult');
          if (storedResult) {
            setResult(JSON.parse(storedResult));
          } else {
            navigate('/');
            return;
          }
        }
      } catch (err) {
        console.error('Failed to fetch verification result:', err);
        setError(err.message || 'Failed to load verification result');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [userId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="text-center max-w-md">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
            <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('common.error')}</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Button onClick={() => navigate('/')} className="bg-blue-600 hover:bg-blue-700 text-white">
            {t('result.return_home')}
          </Button>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const isApproved = result.status === 'approved';
  const isPending = result.status === 'pending';
  const isFailed = result.status === 'failed';
  const idResult = result.idVerification || {};
  const selfieResult = result.selfieVerification || {};
  const thresholds = result.thresholds || {};
  const progress = result.progress || {};

  const handleStartNew = () => {
    localStorage.removeItem('verificationResult');
    localStorage.removeItem('idVerificationResult');
    localStorage.removeItem('idPhotoUrl');
    localStorage.removeItem('currentVerificationId');
    navigate('/upload-id');
  };

  const handleContinueSelfie = () => {
    navigate('/upload-selfie');
  };

  // Get header color based on status
  const getHeaderColor = () => {
    if (isApproved) return 'bg-green-500';
    if (isPending) return 'bg-blue-500';
    if (isFailed) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Get header background color
  const getHeaderBgColor = () => {
    if (isApproved) return 'bg-green-100 dark:bg-green-900/30';
    if (isPending) return 'bg-blue-100 dark:bg-blue-900/30';
    if (isFailed) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  // Get header icon color
  const getIconColor = () => {
    if (isApproved) return 'text-green-600 dark:text-green-400';
    if (isPending) return 'text-blue-600 dark:text-blue-400';
    if (isFailed) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Get status title
  const getStatusTitle = () => {
    if (isApproved) return t('result.success');
    if (isPending) return t('result.pending_title');
    if (isFailed) return t('result.system_error');
    return t('result.failed');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Card */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl mb-6 overflow-hidden">
          <div className={`h-2 ${getHeaderColor()}`} />
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center">
                <div className={`flex-shrink-0 flex items-center justify-center h-16 w-16 rounded-full mr-4 ${getHeaderBgColor()}`}>
                  {isApproved ? (
                    <svg className={`h-8 w-8 ${getIconColor()}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isPending ? (
                    <svg className={`h-8 w-8 ${getIconColor()}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : isFailed ? (
                    <svg className={`h-8 w-8 ${getIconColor()}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : (
                    <svg className={`h-8 w-8 ${getIconColor()}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {getStatusTitle()}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {result.createdAt && (
                      <span>{new Date(result.createdAt).toLocaleString()}</span>
                    )}
                    {result.id && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                          {result.id}
                        </span>
                      </>
                    )}
                    {result.country && (
                      <>
                        <span>•</span>
                        <span className="uppercase">{result.country}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={result.status} t={t} large />
                {isPending && !selfieResult.status ? (
                  <Button onClick={handleContinueSelfie} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {t('result.continue_selfie')}
                  </Button>
                ) : (
                  <Button onClick={handleStartNew} variant="outline" className="border-gray-300 dark:border-gray-600">
                    {t('result.return_home')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Verification Progress Card - Show for pending */}
        {isPending && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl mb-6 p-4">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-blue-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-800 dark:text-blue-300">{t('result.pending_msg')}</h4>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">{t('result.pending_desc')}</p>
                
                {/* Progress Steps */}
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      progress.idVerification?.approved ? 'bg-green-500' : 
                      progress.idVerification?.completed ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}>
                      {progress.idVerification?.approved ? (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : progress.idVerification?.completed ? (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <span className="text-white font-semibold">1</span>
                      )}
                    </div>
                    <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t('result.step_id')}</span>
                  </div>
                  
                  <div className={`flex-1 h-1 rounded ${
                    progress.idVerification?.approved ? 'bg-green-300' : 'bg-gray-300 dark:bg-gray-600'
                  }`} />
                  
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      progress.selfieVerification?.approved ? 'bg-green-500' : 
                      progress.selfieVerification?.completed ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}>
                      {progress.selfieVerification?.approved ? (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : progress.selfieVerification?.completed ? (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <span className="text-white font-semibold">2</span>
                      )}
                    </div>
                    <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t('result.step_selfie')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          {/* Left Sidebar - Images & Thresholds */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* ID Card Images */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                  {t('result.id_images')}
                </h3>
              </div>
              <div className="p-4 space-y-4">
                {result.images?.idFront ? (
                  <ImageCard 
                    label={t('result.id_front')} 
                    url={result.images.idFront} 
                    status={idResult.status}
                  />
                ) : (
                  <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400 text-sm">{t('result.no_image')}</span>
                  </div>
                )}
                {result.images?.idBack && (
                  <ImageCard 
                    label={t('result.id_back')} 
                    url={result.images.idBack}
                    status={idResult.status}
                  />
                )}
              </div>
            </div>

            {/* Selfie Image */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {t('result.selfie_image')}
                </h3>
              </div>
              <div className="p-4">
                {result.images?.selfie ? (
                  <ImageCard 
                    label={t('result.selfie')} 
                    url={result.images.selfie}
                    status={selfieResult.status}
                    large
                  />
                ) : (
                  <div className="h-48 bg-gray-100 dark:bg-gray-700 rounded-lg flex flex-col items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-gray-400 text-sm">{t('result.selfie_not_uploaded')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Thresholds */}
            {Object.keys(thresholds).length > 0 && (
              <div className="bg-white dark:bg-gray-800 shadow rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    {t('result.thresholds')}
                  </h3>
                </div>
                <div className="p-4 space-y-2 text-sm">
                  <ThresholdItem label={t('result.th_name_confidence')} value={`≥ ${(thresholds.fullNameConfidence * 100).toFixed(0)}%`} />
                  <ThresholdItem label={t('result.th_id_confidence')} value={`≥ ${(thresholds.identityNumberConfidence * 100).toFixed(0)}%`} />
                  <ThresholdItem label={t('result.th_image_quality')} value={`≥ ${(thresholds.imageQuality * 100).toFixed(0)}%`} />
                  <ThresholdItem label={t('result.th_match_confidence')} value={`≥ ${thresholds.matchConfidence}%`} />
                  <ThresholdItem label={t('result.th_spoofing_max')} value={`≤ ${(thresholds.spoofingRiskMax * 100).toFixed(0)}%`} />
                  <ThresholdItem label={t('result.th_face_detection')} value={`≥ ${(thresholds.faceDetectionConfidence * 100).toFixed(0)}%`} />
                  <ThresholdItem label={t('result.th_min_age')} value={`${thresholds.minAge} ${t('result.years')}`} />
                  <ThresholdItem label={t('result.th_max_age')} value={`${thresholds.maxAge} ${t('result.years')}`} />
                </div>
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <div className="xl:col-span-3 space-y-6">
            
            {/* ID Verification Card */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                  </span>
                  {t('result.id_verification')}
                </h3>
                <StatusBadge status={idResult.status} t={t} />
              </div>
              
              {idResult.data ? (
                <div className="p-6">
                  {/* Personal Information */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
                      {t('result.personal_info')}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      <DataField label={t('result.full_name')} value={idResult.data.fullName} icon="👤" />
                      <DataField label={t('result.identity_number')} value={maskIdentityNumber(idResult.data.identityNumber)} icon="🔢" mono />
                      <DataField label={t('result.date_of_birth')} value={formatDate(idResult.data.dateOfBirth)} icon="🎂" />
                      <DataField label={t('result.gender')} value={idResult.data.gender === 'M' ? t('result.male') : idResult.data.gender === 'F' ? t('result.female') : idResult.data.gender} icon="⚧" />
                      <DataField label={t('result.nationality')} value={idResult.data.nationality} icon="🌍" />
                      <DataField label={t('result.expiry_date')} value={formatDate(idResult.data.expiryDate)} icon="📅" highlight={isExpired(idResult.data.expiryDate)} />
                      <DataField label={t('result.serial_number')} value={idResult.data.serialNumber} icon="🔖" mono />
                      <DataField label={t('result.document_condition')} value={idResult.data.documentCondition} icon="📄" capitalize />
                    </div>
                  </div>

                  {/* Address (if available) */}
                  {idResult.data.address && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
                        {t('result.address')}
                      </h4>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <p className="text-gray-900 dark:text-white">{idResult.data.address}</p>
                      </div>
                    </div>
                  )}

                  {/* MRZ (if available) */}
                  {idResult.data.mrz && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
                        {t('result.mrz')}
                      </h4>
                      <div className="bg-gray-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
                        <code className="text-green-400 font-mono text-xs whitespace-pre">
                          {formatMRZ(idResult.data.mrz)}
                        </code>
                      </div>
                    </div>
                  )}

                  {/* Confidence Scores */}
                  {idResult.confidence && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
                        {t('result.confidence_scores')}
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        <ConfidenceCircle 
                          label={t('result.image_quality')} 
                          value={idResult.confidence.imageQuality} 
                          threshold={thresholds.imageQuality || 0.7}
                        />
                        <ConfidenceCircle 
                          label={t('result.name_confidence')} 
                          value={idResult.confidence.fullName} 
                          threshold={thresholds.fullNameConfidence || 0.8}
                        />
                        <ConfidenceCircle 
                          label={t('result.id_confidence')} 
                          value={idResult.confidence.identityNumber} 
                          threshold={thresholds.identityNumberConfidence || 0.95}
                        />
                        <ConfidenceCircle 
                          label={t('result.dob_confidence')} 
                          value={idResult.confidence.dateOfBirth} 
                          threshold={thresholds.dateOfBirthConfidence || 0.9}
                        />
                        <ConfidenceCircle 
                          label={t('result.expiry_confidence')} 
                          value={idResult.confidence.expiryDate} 
                          threshold={thresholds.expiryDateConfidence || 0.9}
                        />
                      </div>
                    </div>
                  )}

                  {/* ID Errors */}
                  {idResult.rejectionReasons?.length > 0 && (
                    <ErrorSection errors={idResult.rejectionReasons} t={t} />
                  )}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-2 text-gray-500 dark:text-gray-400">{t('result.id_not_verified')}</p>
                </div>
              )}
            </div>

            {/* Selfie Verification Card */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <span className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  {t('result.selfie_verification')}
                </h3>
                <StatusBadge status={selfieResult.status} t={t} />
              </div>
              
              {selfieResult.data ? (
                <div className="p-6">
                  {/* Face Match Result - Hero Section */}
                  <div className="mb-6 p-6 rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                          selfieResult.data.isMatch ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                        }`}>
                          {selfieResult.data.isMatch ? (
                            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        <div className="ml-4">
                          <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                            {selfieResult.data.isMatch ? t('result.match_yes') : t('result.match_no')}
                          </h4>
                          <p className="text-gray-500 dark:text-gray-400">{t('result.face_comparison_result')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-bold text-gray-900 dark:text-white">
                          {selfieResult.data.matchConfidence || 0}%
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('result.match_confidence')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Selfie Analysis Grid */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
                      {t('result.selfie_analysis')}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      <AnalysisCard 
                        label={t('result.face_count')} 
                        value={selfieResult.data.faceCount}
                        expected={1}
                        icon="👤"
                        good={selfieResult.data.faceCount === 1}
                      />
                      <AnalysisCard 
                        label={t('result.spoofing_risk')} 
                        value={`${((selfieResult.data.spoofingRisk || 0) * 100).toFixed(0)}%`}
                        icon="🎭"
                        good={(selfieResult.data.spoofingRisk || 0) <= (thresholds.spoofingRiskMax || 0.3)}
                        inverse
                      />
                      <AnalysisCard 
                        label={t('result.lighting')} 
                        value={selfieResult.data.lightingCondition || 'N/A'}
                        icon="💡"
                        good={selfieResult.data.lightingCondition === 'good'}
                      />
                      <AnalysisCard 
                        label={t('result.face_size')} 
                        value={selfieResult.data.faceSize || 'N/A'}
                        icon="📐"
                        good={selfieResult.data.faceSize === 'adequate'}
                      />
                      <AnalysisCard 
                        label={t('result.face_coverage')} 
                        value={selfieResult.data.faceCoverage || 'N/A'}
                        icon="👁"
                        good={selfieResult.data.faceCoverage === 'clear'}
                      />
                      <AnalysisCard 
                        label={t('result.image_quality')} 
                        value={`${((selfieResult.data.imageQuality || 0) * 100).toFixed(0)}%`}
                        icon="🖼"
                        good={(selfieResult.data.imageQuality || 0) >= (thresholds.imageQuality || 0.7)}
                      />
                    </div>
                  </div>

                  {/* Confidence Scores */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
                      {t('result.confidence_scores')}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <ConfidenceBar 
                        label={t('result.face_detection')} 
                        value={selfieResult.data.faceDetectionConfidence} 
                        threshold={thresholds.faceDetectionConfidence || 0.8}
                      />
                      <ConfidenceBar 
                        label={t('result.image_quality')} 
                        value={selfieResult.data.imageQuality} 
                        threshold={thresholds.imageQuality || 0.7}
                      />
                      <ConfidenceBar 
                        label={t('result.match_score')} 
                        value={(selfieResult.data.matchConfidence || 0) / 100} 
                        threshold={(thresholds.matchConfidence || 80) / 100}
                      />
                    </div>
                  </div>

                  {/* Image Quality Issues */}
                  {selfieResult.data.imageQualityIssues?.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
                        {t('result.quality_issues')}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selfieResult.data.imageQualityIssues.map((issue, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {issue}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Selfie Errors */}
                  {selfieResult.rejectionReasons?.length > 0 && (
                    <ErrorSection errors={selfieResult.rejectionReasons} t={t} />
                  )}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <p className="mt-2 text-gray-500 dark:text-gray-400">{t('result.selfie_not_verified')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Helper Components
// ============================================================================

const StatusBadge = ({ status, t, large }) => {
  const config = {
    approved: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', dot: 'bg-green-500' },
    rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', dot: 'bg-red-500' },
    failed: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', dot: 'bg-yellow-500' },
    pending: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300', dot: 'bg-blue-500 animate-pulse' }
  }[status] || { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-500' };
  
  const labels = { approved: t('result.status_approved'), rejected: t('result.status_rejected'), failed: t('result.status_failed'), pending: t('result.status_pending') };
  
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full font-medium ${config.bg} ${config.text} ${large ? 'text-sm' : 'text-xs'}`}>
      <span className={`w-2 h-2 rounded-full mr-2 ${config.dot}`} />
      {labels[status] || status}
    </span>
  );
};

const ImageCard = ({ label, url, status, large }) => (
  <div className="relative group">
    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
    <div className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      <img 
        src={url} 
        alt={label} 
        className={`w-full object-cover ${large ? 'h-48' : 'h-28'} group-hover:scale-105 transition-transform duration-200`}
      />
      {status && (
        <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center ${
          status === 'approved' ? 'bg-green-500' : status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'
        }`}>
          {status === 'approved' ? (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
      )}
    </div>
  </div>
);

const DataField = ({ label, value, icon, mono, capitalize, highlight }) => (
  <div className={`p-3 rounded-lg ${highlight ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{icon} {label}</p>
    <p className={`text-sm font-semibold text-gray-900 dark:text-white truncate ${mono ? 'font-mono' : ''} ${capitalize ? 'capitalize' : ''} ${highlight ? 'text-red-600 dark:text-red-400' : ''}`}>
      {value || '—'}
    </p>
  </div>
);

const ConfidenceCircle = ({ label, value, threshold }) => {
  const percentage = Math.round((value || 0) * 100);
  const isGood = (value || 0) >= threshold;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 transform -rotate-90">
          <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-200 dark:text-gray-600" />
          <circle 
            cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="none" 
            strokeDasharray={circumference} 
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={isGood ? 'text-green-500' : 'text-red-500'}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-bold ${isGood ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {percentage}%
          </span>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">{label}</p>
    </div>
  );
};

const ConfidenceBar = ({ label, value, threshold }) => {
  const percentage = Math.round((value || 0) * 100);
  const isGood = (value || 0) >= threshold;
  
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div className="flex justify-between text-xs mb-2">
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
        <span className={`font-semibold ${isGood ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {percentage}%
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full transition-all duration-300 ${isGood ? 'bg-green-500' : 'bg-red-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const AnalysisCard = ({ label, value, icon, good, expected, inverse }) => (
  <div className={`p-4 rounded-lg border-2 ${good ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'}`}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-2xl">{icon}</span>
      {good ? (
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
    </div>
    <p className={`text-lg font-bold capitalize ${good ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
      {value}
    </p>
    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    {expected !== undefined && (
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Expected: {expected}</p>
    )}
  </div>
);

const ThresholdItem = ({ label, value }) => (
  <div className="flex justify-between py-1">
    <span className="text-gray-500 dark:text-gray-400">{label}</span>
    <span className="text-gray-900 dark:text-white font-mono text-xs">{value}</span>
  </div>
);

const ErrorSection = ({ errors, t }) => (
  <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
    <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center">
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {t('result.issues_found')}
    </h4>
    <ul className="space-y-2">
      {errors.map((error, index) => (
        <li key={index} className="flex items-start text-sm text-red-700 dark:text-red-300">
          <span className="text-red-500 mr-2">•</span>
          {error}
        </li>
      ))}
    </ul>
  </div>
);

// ============================================================================
// Helper Functions
// ============================================================================

const maskIdentityNumber = (idNumber) => {
  if (!idNumber || idNumber.length < 4) return idNumber;
  return idNumber.slice(0, 3) + '*'.repeat(Math.max(0, idNumber.length - 6)) + idNumber.slice(-3);
};

const formatDate = (dateString) => {
  if (!dateString) return null;
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
};

const isExpired = (dateString) => {
  if (!dateString) return false;
  try {
    return new Date(dateString) < new Date();
  } catch {
    return false;
  }
};

const formatMRZ = (mrz) => {
  if (!mrz) return '';
  // Split MRZ into lines (typically 2 or 3 lines of 30-44 characters)
  const lineLength = mrz.length > 60 ? Math.ceil(mrz.length / 2) : 44;
  const lines = [];
  for (let i = 0; i < mrz.length; i += lineLength) {
    lines.push(mrz.slice(i, i + lineLength));
  }
  return lines.join('\n');
};
