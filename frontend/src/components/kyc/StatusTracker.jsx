import React from 'react';

export const StatusTracker = ({ currentStep, idCardStatus, selfieStatus }) => {
  const getStepIcon = (step, status, isActive) => {
    if (status === 'success') {
      return (
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    }
    
    if (status === 'failed') {
      return (
        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    }
    
    if (isActive) {
      return (
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">{step}</span>
        </div>
      );
    }
    
    return (
      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
        <span className="text-gray-600 font-bold text-sm">{step}</span>
      </div>
    );
  };

  const getStepTitle = (step) => {
    switch (step) {
      case 1:
        return 'ID Card Verification';
      case 2:
        return 'Selfie Verification';
      default:
        return `Step ${step}`;
    }
  };

  const getStepDescription = (step, status) => {
    switch (step) {
      case 1:
        switch (status) {
          case 'success':
            return 'ID card verified successfully';
          case 'failed':
            return 'ID card verification failed';
          default:
            return 'Upload front and back of your ID card';
        }
      case 2:
        switch (status) {
          case 'success':
            return 'Selfie verified successfully';
          case 'failed':
            return 'Selfie verification failed';
          default:
            return 'Take a selfie or upload a photo';
        }
      default:
        return '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between">
        {/* Step 1 */}
        <div className="flex items-center space-x-4 flex-1">
          {getStepIcon(1, idCardStatus, currentStep === 1)}
          <div>
            <h3 className="font-semibold text-gray-900">
              {getStepTitle(1)}
            </h3>
            <p className="text-sm text-gray-600">
              {getStepDescription(1, idCardStatus)}
            </p>
          </div>
        </div>

        {/* Connector */}
        <div className="flex-1 mx-4">
          <div className={`h-0.5 ${idCardStatus === 'success' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
        </div>

        {/* Step 2 */}
        <div className="flex items-center space-x-4 flex-1">
          {getStepIcon(2, selfieStatus, currentStep === 2)}
          <div>
            <h3 className="font-semibold text-gray-900">
              {getStepTitle(2)}
            </h3>
            <p className="text-sm text-gray-600">
              {getStepDescription(2, selfieStatus)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
