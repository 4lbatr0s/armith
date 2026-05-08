import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const isDemoMode = searchParams.get('mode') === 'demo';
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

      // 1. Upload Front Image
      const frontUploadData = await apiService.generateUploadUrl(frontFile.type, null, 'id-front');
      await apiService.uploadFile(frontFile, frontUploadData.uploadUrl, frontUploadData.contentType);

      // 2. Upload Back Image (if exists)
      let backDownloadUrl = null;
      if (backFile) {
        const backUploadData = await apiService.generateUploadUrl(backFile.type, null, 'id-back');
        await apiService.uploadFile(backFile, backUploadData.uploadUrl, backUploadData.contentType);
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
      const limitError = err?.code === 'PLAN_LIMIT_REACHED'
        ? t('upload_id.plan_limit_reached')
        : null;
      setError(limitError || err.response?.data?.error || err.message || t('common.error'));
    } finally {
      setIsUploading(false);
    }
  };

  const inputBase =
    'w-full px-3 py-2.5 border-2 border-pm-ink/15 dark:border-white/20 bg-pm-surface dark:bg-pm-surface-dark rounded-sm focus:outline-none focus:ring-2 focus:ring-pm-accent focus:border-pm-accent text-pm-ink dark:text-pm-ink-soft';

  return (
    <div className="flex-1 w-full py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto pm-panel overflow-hidden">
        <div className="px-6 py-8 sm:px-8">
          <div className="mb-8">
            <span className="pm-kicker mb-3 inline-block text-[10px]">{t('layout.verify_identity')}</span>
            <h2 className="font-display text-2xl font-bold tracking-tight">{t('upload_id.title')}</h2>
            <p className="mt-2 text-sm text-pm-muted">{t('upload_id.subtitle')}</p>
            {isDemoMode && (
              <div className="mt-3 rounded-sm border-2 border-pm-accent/40 bg-pm-accent/10 px-3 py-2 text-xs">
                {t('upload_id.demo_mode_notice')}
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 border-2 border-red-600/40 bg-red-500/10 text-red-800 dark:text-red-200 px-4 py-3 text-sm rounded-sm">
              {error}
              {error === t('upload_id.plan_limit_reached') && (
                <div className="mt-3">
                  <Link to="/pricing" className="underline font-semibold">
                    {t('upload_id.upgrade_cta')}
                  </Link>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-pm-muted mb-2">{t('upload_id.select_country')}</label>
              <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputBase} required>
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
              <label className="block text-xs font-bold uppercase tracking-widest text-pm-muted mb-2">{t('upload_id.front_id')}</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-pm-ink/20 dark:border-white/20 rounded-sm hover:border-pm-accent/60 transition-colors bg-pm-wash/30 dark:bg-pm-void/50">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-pm-muted" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-pm-muted justify-center">
                    <label htmlFor="front-file-upload" className="relative cursor-pointer font-semibold text-pm-accent hover:underline">
                      <span>{t('upload_id.upload_file')}</span>
                      <input id="front-file-upload" name="front-file-upload" type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileChange(e, 'front')} required />
                    </label>
                  </div>
                  <p className="text-xs text-pm-muted">{frontFile ? frontFile.name : t('upload_id.file_types')}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-pm-muted mb-2">{t('upload_id.back_id')}</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-pm-ink/20 dark:border-white/20 rounded-sm hover:border-pm-accent-alt/60 transition-colors bg-pm-wash/30 dark:bg-pm-void/50">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-pm-muted" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-pm-muted justify-center">
                    <label htmlFor="back-file-upload" className="relative cursor-pointer font-semibold text-pm-accent hover:underline">
                      <span>{t('upload_id.upload_file')}</span>
                      <input id="back-file-upload" name="back-file-upload" type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileChange(e, 'back')} />
                    </label>
                  </div>
                  <p className="text-xs text-pm-muted">{backFile ? backFile.name : t('upload_id.file_types')}</p>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full py-3 shadow-brutal border-2 border-pm-ink dark:border-white/20" disabled={isUploading}>
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
