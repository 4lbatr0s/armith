import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for Kinde session-based auth
});

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const apiService = {
  // Health check
  healthCheck: async () => {
    const response = await apiClient.get('/health');
    return response.data;
  },

  // Authentication methods
  auth: {
    callback: async () => {
      const response = await apiClient.post('/auth/callback');
      return response.data;
    },
    
    getProfile: async () => {
      const response = await apiClient.get('/auth/profile');
      return response.data;
    },
    
    checkStatus: async () => {
      const response = await apiClient.get('/auth/status');
      return response.data;
    }
  },

  // Get supported countries
  getSupportedCountries: async () => {
    const response = await apiClient.get('/kyc/countries');
    return response.data;
  },

  // Generate presigned upload URL
  generateUploadUrl: async (fileType) => {
    const response = await apiClient.post('/kyc/upload-url', { fileType });
    
    return response.data;
  },

  // Local file upload method (FormData)
  uploadFileLocal: async (file, uploadUrl) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(uploadUrl, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  // ID verification
  verifyId: async (request) => {
    const response = await apiClient.post('/kyc/id-check', request);
    return response.data;
  },

  // Selfie verification
  verifySelfie: async (request) => {
    const response = await apiClient.post('/kyc/selfie-check', request);
    return response.data;
  },

  // Get user verification status
  getUserStatus: async (userId) => {
    const response = await apiClient.get(`/kyc/status/${userId}`);
    return response.data;
  },

  // Admin: Get all verifications
  getVerifications: async (page = 1, limit = 10, status) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (status) {
      params.append('status', status);
    }

    const response = await apiClient.get(`/admin/verifications?${params}`);
    return response.data;
  },
};

// Helper function to handle file upload process
export const uploadFileHelper = async (file) => {
  try {
    // Get presigned URL
    const uploadData = await apiService.generateUploadUrl(file.type);
    
    // Upload file to S3
    await apiService.uploadFile(file, uploadData.uploadUrl);
    
    // Return the download URL
    return uploadData.downloadUrl;
  } catch (error) {
    console.error('File upload failed:', error);
    throw new Error('Failed to upload file');
  }
};

// Helper function to handle multiple file uploads
export const uploadMultipleFiles = async (files) => {
  try {
    const uploadPromises = files.map(file => uploadFileHelper(file));
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Multiple file upload failed:', error);
    throw new Error('Failed to upload files');
  }
};

export default apiService; 