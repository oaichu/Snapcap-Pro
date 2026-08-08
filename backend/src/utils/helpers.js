export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function getCurrentTimestamp() {
  return new Date().toISOString();
}

export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString();
}

export function bytesToMB(bytes) {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

export function mbToBytes(mb) {
  return mb * 1024 * 1024;
}

export function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function getFileTypeFromDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);/);
  return match ? match[1] : null;
}

export function extractBase64FromDataUrl(dataUrl) {
  const parts = dataUrl.split(',');
  return parts.length > 1 ? parts[1] : null;
}

export function isValidDataUrl(dataUrl) {
  return typeof dataUrl === 'string' && dataUrl.startsWith('data:');
}

export function calculateStorageUsed(captures) {
  return captures.reduce((total, capture) => total + (capture.sizeMB || 0), 0);
}

export function isExpired(expiresAt) {
  return new Date(expiresAt) < new Date();
}

export function getRemainingDays(expiresAt) {
  const diff = new Date(expiresAt) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
