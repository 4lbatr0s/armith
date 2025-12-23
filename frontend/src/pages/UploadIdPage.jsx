import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import { Button } from '../components/ui/button';

const ID_PROMPTS = {
  'us': 'US Driver License',
  'uk': 'UK Driving Licence',
  'ca': 'Canadian Driver\'s License',
  'au': 'Australian Driver Licence',
  'de': 'German Identity Card',
  'fr': 'French Identity Card',
  'it': 'Italian Identity Card',
  'es': 'Spanish Identity Card',
  'tr': 'Turkish Identity Card',
  'default': 'Government Issued ID'
};

export const UploadIdPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  const [country, setCountry] = useState('');
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e, side) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError(t('upload_id.error_file_size') || 'File size must be less than 10MB');
        return;
      }
      if (side === 'front') setFrontFile(file);
      else setBackFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!country || !frontFile) {
      setError(t('upload_id.error_missing_fields') || 'Please select a country and upload the front of your ID');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      const userId = user?.id;

      // 1. Upload Front Image
      const frontUploadData = await apiService.generateUploadUrl(frontFile.type, userId, 'id-front');
      await apiService.uploadFile(frontFile, frontUploadData.uploadUrl);

      // 2. Upload Back Image (if exists)
      let backDownloadUrl = null;
      if (backFile) {
        const backUploadData = await apiService.generateUploadUrl(backFile.type, userId, 'id-back');
        await apiService.uploadFile(backFile, backUploadData.uploadUrl);
        backDownloadUrl = backUploadData.downloadUrl;
      }

      // 3. Verify ID
      const verificationResult = await apiService.verifyId({
        countryCode: country,
        documentType: ID_PROMPTS[country] || ID_PROMPTS.default,
        frontImageUrl: frontUploadData.downloadUrl,
        backImageUrl: backDownloadUrl,
        userId: user?.id,
        userEmail: user?.emailAddresses?.[0]?.emailAddress
      });

      // Store the verification ID (profileId), ID photo URL, and ID result
      if (verificationResult.profileId) {
        localStorage.setItem('currentVerificationId', verificationResult.profileId);
      }
      localStorage.setItem('idPhotoUrl', frontUploadData.downloadUrl);
      localStorage.setItem('idVerificationResult', JSON.stringify(verificationResult));

      navigate('/upload-selfie');
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.response?.data?.error || err.message || t('common.error'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-colors duration-200">
        <div className="px-6 py-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('upload_id.title')}</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">{t('upload_id.subtitle')}</p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('upload_id.select_country')}
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">{t('upload_id.select_country')}</option>
                <option value="us">United States</option>
                <option value="uk">United Kingdom</option>
                <option value="ca">Canada</option>
                <option value="au">Australia</option>
                <option value="de">Germany</option>
                <option value="fr">France</option>
                <option value="it">Italy</option>
                <option value="es">Spain</option>
                <option value="tr">Turkey</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('upload_id.front_id')}
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-gray-600 dark:text-gray-400">
                    <label htmlFor="front-file-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                      <span>{t('upload_id.upload_file')}</span>
                      <input id="front-file-upload" name="front-file-upload" type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileChange(e, 'front')} required />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{frontFile ? frontFile.name : t('upload_id.file_types')}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('upload_id.back_id')}
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-gray-600 dark:text-gray-400">
                    <label htmlFor="back-file-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                      <span>{t('upload_id.upload_file')}</span>
                      <input id="back-file-upload" name="back-file-upload" type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileChange(e, 'back')} />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{backFile ? backFile.name : t('upload_id.file_types')}</p>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50" disabled={isUploading}>
              {isUploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('upload_id.verifying')}
                </>
              ) : (
                t('upload_id.next_step')
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
