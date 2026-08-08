export const Collections = {
  USERS: 'users',
  CAPTURES: 'captures',
  SUBSCRIPTIONS: 'subscriptions',
  ANALYTICS: 'analytics'
};

export const UserSchema = {
  uid: 'string',
  email: 'string',
  displayName: 'string',
  photoURL: 'string',
  subscription: 'free|pro',
  captureCount: 'number',
  storageUsedMB: 'number',
  createdAt: 'string (ISO date)',
  updatedAt: 'string (ISO date)',
  upgradedAt: 'string (ISO date)',
  cancelledAt: 'string (ISO date)',
  paymentMethodId: 'string',
  lastLoginAt: 'string (ISO date)'
};

export const CaptureSchema = {
  id: 'string (auto-generated)',
  userId: 'string',
  type: 'image|video',
  url: 'string (storage path)',
  sizeMB: 'number',
  width: 'number',
  height: 'number',
  duration: 'number (for video)',
  title: 'string',
  tags: 'array of strings',
  isPublic: 'boolean',
  createdAt: 'string (ISO date)',
  expiresAt: 'string (ISO date)'
};

export const SubscriptionSchema = {
  id: 'string (auto-generated)',
  userId: 'string',
  plan: 'free|pro',
  status: 'active|cancelled|expired',
  paymentProvider: 'string',
  paymentMethodId: 'string',
  subscriptionId: 'string',
  currentPeriodStart: 'string (ISO date)',
  currentPeriodEnd: 'string (ISO date)',
  cancelAtPeriodEnd: 'boolean',
  createdAt: 'string (ISO date)',
  updatedAt: 'string (ISO date)'
};

export const AnalyticsSchema = {
  id: 'string (auto-generated)',
  userId: 'string',
  event: 'string',
  data: 'object',
  timestamp: 'string (ISO date)'
};

export const Indexes = [
  {
    collection: Collections.CAPTURES,
    fields: [['userId', 'asc'], ['createdAt', 'desc']]
  },
  {
    collection: Collections.CAPTURES,
    fields: [['userId', 'asc'], ['type', 'asc'], ['createdAt', 'desc']]
  },
  {
    collection: Collections.USERS,
    fields: [['email', 'asc']]
  },
  {
    collection: Collections.SUBSCRIPTIONS,
    fields: [['userId', 'asc'], ['status', 'asc']]
  }
];

export const SecurityRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    match /users/{userId} {
      allow read: if isAuthenticated() && isOwner(userId);
      allow create: if isAuthenticated() && isOwner(userId);
      allow update: if isAuthenticated() && isOwner(userId);
      allow delete: if isAuthenticated() && isOwner(userId);
    }
    
    match /captures/{captureId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
    
    match /subscriptions/{subscriptionId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
    
    match /analytics/{analyticsId} {
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow read, update, delete: if false;
    }
  }
}
`;

export const StorageRules = `
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function isValidImageType() {
      return request.resource.type.matches('image/.*');
    }
    
    function isValidVideoType() {
      return request.resource.type == 'video/webm';
    }
    
    function isWithinSizeLimit() {
      return request.resource.size < 50 * 1024 * 1024;
    }
    
    match /captures/{userId}/{fileName} {
      allow read: if isAuthenticated() && isOwner(userId);
      allow create: if isAuthenticated() 
                    && isOwner(userId)
                    && (isValidImageType() || isValidVideoType())
                    && isWithinSizeLimit();
      allow delete: if isAuthenticated() && isOwner(userId);
    }
  }
}
`;
