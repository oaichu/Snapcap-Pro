import dotenv from 'dotenv';
dotenv.config();

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  firebase: {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json',
  },

  cors: {
    // Accept any chrome-extension:// origin (the extension ID varies per install),
    // plus any explicitly allowed origins from CORS_ORIGIN. Non-browser requests
    // (e.g. curl / health checks) have no Origin header and are allowed.
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (origin.startsWith('chrome-extension://')) return cb(null, true);
      const allowed = (process.env.CORS_ORIGIN || '')
        .split(',')
        .map(o => o.trim())
        .filter(Boolean);
      if (allowed.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: false,
  },

  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
  },

  storage: {
    maxFileSize: 50 * 1024 * 1024,
    allowedTypes: ['image/png', 'video/webm', 'image/jpeg'],
  },

  // SnapCap is 100% FREE for the community. "Pro" is retained as a feature label
  // only — the free tier now unlocks every feature and generous limits so that no
  // feature gating or paywall applies to anyone.
  subscription: {
    free: {
      maxCaptures: 100000,
      maxStorageMB: 300000,
      maxRecordingSeconds: 1800,
      features: [
        'screenshot',
        'recording',
        'basic_editing',
        'full_page_capture',
        'screen_recording',
        'blur_redaction',
        'cloud_sync',
        'priority_support',
      ],
    },
    pro: {
      maxCaptures: 100000,
      maxStorageMB: 300000,
      maxRecordingSeconds: 1800,
      features: [
        'screenshot',
        'recording',
        'basic_editing',
        'full_page_capture',
        'screen_recording',
        'blur_redaction',
        'cloud_sync',
        'priority_support',
      ],
    },
  },
};

export default config;
