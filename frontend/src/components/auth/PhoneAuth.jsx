import React, { useState, useEffect, useRef } from 'react';
import { initializeRecaptcha, sendOTP, verifyOTP } from '../../lib/firebase';

export const PhoneAuth = ({ onSuccess, onError, disabled = false }) => {
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const recaptchaRef = useRef(null);
  const recaptchaVerifierRef = useRef(null);

  useEffect(() => {
    // Initialize reCAPTCHA
    if (step === 'phone' && !recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = initializeRecaptcha('recaptcha-container');
    }
  }, [step]);

  const handleSendOTP = async () => {
    if (!phoneNumber || loading || disabled) return;
    
    setLoading(true);
    setError('');
    
    try {
      const result = await sendOTP(phoneNumber, recaptchaVerifierRef.current);
      setConfirmationResult(result);
      setStep('otp');
    } catch (error) {
      console.error('OTP send error:', error);
      setError(error.message || 'Failed to send OTP');
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || !confirmationResult || loading || disabled) return;
    
    setLoading(true);
    setError('');
    
    try {
      const user = await verifyOTP(confirmationResult, otp);
      onSuccess?.(user);
    } catch (error) {
      console.error('OTP verification error:', error);
      setError(error.message || 'Invalid OTP');
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPhone = () => {
    setStep('phone');
    setOtp('');
    setError('');
    setConfirmationResult(null);
  };

  const formatPhoneNumber = (value) => {
    // Remove all non-digits
    const phoneNumber = value.replace(/\D/g, '');
    
    // Add country code if not present
    if (phoneNumber.length > 0 && !phoneNumber.startsWith('+')) {
      return `+${phoneNumber}`;
    }
    
    return phoneNumber;
  };

  return (
    <div className="w-full space-y-4">
      {step === 'phone' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
              placeholder="+1234567890"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading || disabled}
            />
          </div>
          
          <button
            onClick={handleSendOTP}
            disabled={!phoneNumber || loading || disabled}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Sending OTP...
              </div>
            ) : (
              'Send OTP'
            )}
          </button>
        </div>
      )}

      {step === 'otp' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
              Enter OTP sent to {phoneNumber}
            </label>
            <input
              id="otp"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest"
              disabled={loading || disabled}
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleBackToPhone}
              disabled={loading || disabled}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Back
            </button>
            
            <button
              onClick={handleVerifyOTP}
              disabled={!otp || loading || disabled}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Verifying...
                </div>
              ) : (
                'Verify OTP'
              )}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* reCAPTCHA container */}
      <div id="recaptcha-container"></div>
    </div>
  );
};
