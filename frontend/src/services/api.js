const isProductionBuild = process.env.NODE_ENV === 'production';
const configuredApiBaseUrl = process.env.REACT_APP_API_URL;

if (isProductionBuild && !configuredApiBaseUrl) {
  throw new Error('REACT_APP_API_URL is required for production builds.');
}

const API_BASE_URL = configuredApiBaseUrl || 'http://localhost:3001';

// Helper to get Clerk token - will be set by ClerkProvider context
let getToken = null;

export const setTokenGetter = (tokenGetter) => {
  getToken = tokenGetter;
};

const request = async (url, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Add Clerk token if available
  if (getToken) {
    try {
      const token = await getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to get Clerk token:', error);
    }
  }

  const config = {
    credentials: 'include',
    headers,
    ...options
  };

  const response = await fetch(`${API_BASE_URL}${url}`, config);

  // Handle non-JSON responses
  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text || 'Request failed' };
    }
  }

  if (!response.ok) {
    console.error('API Error:', data);
    const firstError = Array.isArray(data?.errors) ? data.errors[0] : null;
    const error = new Error(firstError?.message || data.error || data.message || 'Request failed');
    if (firstError?.code) error.code = firstError.code;
    throw error;
  }

  return data;
};

export const apiService = {
  getProfile: () => request('/auth/profile'),

  healthCheck: () => request('/health'),

  getSupportedCountries: () => request('/kyc/countries'),

  generateUploadUrl: (fileType, userId = null, documentType = null) => request('/kyc/upload-url', {
    method: 'POST',
    body: JSON.stringify({ fileType, userId, documentType })
  }),

  uploadFile: async (file, uploadUrl) => {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type }
    });

    if (!response.ok) throw new Error('Upload failed');
    return true;
  },

  verifyId: (data) => request('/kyc/id-check', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  verifySelfie: (data) => request('/kyc/selfie-check', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  getUserStatus: (profileId) => request(`/kyc/status/${profileId}`),

  getVerifications: (page = 1, limit = 10, status) => {
    const params = new URLSearchParams({ page, limit });
    if (status) params.append('status', status);
    return request(`/admin/verifications?${params}`);
  },

  getStats: () => request('/admin/stats'),

  getApiKeys: () => request('/admin/api-keys'),

  createApiKey: (name) => request('/admin/api-keys', {
    method: 'POST',
    body: JSON.stringify({ name })
  }),

  revokeApiKey: (id) => request(`/admin/api-keys/${id}`, {
    method: 'DELETE'
  }),

  // Settings
  getSettings: () => request('/admin/settings'),
  
  updateSettings: (settings) => request('/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(settings)
  }),
  
  resetSettings: () => request('/admin/settings/reset', {
    method: 'POST'
  })
};

export const uploadFileHelper = async (file) => {
    const uploadData = await apiService.generateUploadUrl(file.type);
    await apiService.uploadFile(file, uploadData.uploadUrl);
    return uploadData.downloadUrl;
};

export default apiService; 
