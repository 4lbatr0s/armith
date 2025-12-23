import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
}

export function getStatusColor(status) {
  switch (status) {
    case 'approved':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'rejected':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'pending':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'failed':
      return 'text-gray-600 bg-gray-50 border-gray-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function getStatusIcon(status) {
  switch (status) {
    case 'approved':
      return '✅';
    case 'rejected':
      return '❌';
    case 'pending':
      return '⏳';
    case 'failed':
      return '⚠️';
    default:
      return '❓';
  }
}

export function truncateText(text, maxLength = 50) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

export function isValidImageFile(file) {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  return validTypes.includes(file.type);
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDateOnly(dateString) {
  if (!dateString) return null;
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function maskIdentityNumber(idNumber) {
  if (!idNumber || idNumber.length < 4) return idNumber;
  return idNumber.slice(0, 3) + '*'.repeat(Math.max(0, idNumber.length - 6)) + idNumber.slice(-3);
}

export function isExpired(dateString) {
  if (!dateString) return false;
  try {
    return new Date(dateString) < new Date();
  } catch {
    return false;
  }
}

export function formatMRZ(mrz) {
  if (!mrz) return '';
  const lineLength = mrz.length > 60 ? Math.ceil(mrz.length / 2) : 44;
  const lines = [];
  for (let i = 0; i < mrz.length; i += lineLength) {
    lines.push(mrz.slice(i, i + lineLength));
  }
  return lines.join('\n');
}