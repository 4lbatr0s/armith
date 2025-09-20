import React, { useState } from 'react';
import { IDCardStep } from '../components/kyc/IDCardStep';
import { SelfieStep } from '../components/kyc/SelfieStep';
import { StatusTracker } from '../components/kyc/StatusTracker';

export const TestKYCFlow = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [idCardStatus, setIdCardStatus] = useState('pending'); // pending, success, failed
  const [selfieStatus, setSelfieStatus] = useState('pending'); // pending, success, failed
  const [idCardData, setIdCardData] = useState(null);
  const [, setSelfieData] = useState(null);

  const handleIDCardComplete = (data, status) => {
    setIdCardData(data);
    setIdCardStatus(status);
    if (status === 'success') {
      setCurrentStep(2);
    }
  };

  const handleSelfieComplete = (data, status) => {
    setSelfieData(data);
    setSelfieStatus(status);
  };

  const handleReset = () => {
    setCurrentStep(1);
    setIdCardStatus('pending');
    setSelfieStatus('pending');
    setIdCardData(null);
    setSelfieData(null);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Test KYC Verification Flow
          </h1>
          <p className="text-gray-600">
            Complete identity verification in 2 simple steps
          </p>
        </div>

        {/* Status Tracker */}
        <StatusTracker 
          currentStep={currentStep}
          idCardStatus={idCardStatus}
          selfieStatus={selfieStatus}
        />

        {/* Step Content */}
        <div className="mt-8">
          {currentStep === 1 && (
            <IDCardStep 
              onComplete={handleIDCardComplete}
              status={idCardStatus}
            />
          )}
          
          {currentStep === 2 && (
            <SelfieStep 
              onComplete={handleSelfieComplete}
              status={selfieStatus}
              idCardData={idCardData}
            />
          )}
        </div>

        {/* Reset Button */}
        {(idCardStatus === 'success' || selfieStatus === 'success' || selfieStatus === 'failed') && (
          <div className="mt-8 text-center">
            <button
              onClick={handleReset}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
            >
              Start New Verification
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
