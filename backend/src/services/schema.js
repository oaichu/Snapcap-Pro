export const Collections = {
  USERS: 'users',
  CAPTURES: 'captures',
  SUBSCRIPTIONS: 'subscriptions',
  ANALYTICS: 'analytics',
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
  lastLoginAt: 'string (ISO date)',
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
  expiresAt: 'string (ISO date)',
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
  updatedAt: 'string (ISO date)',
};

export const AnalyticsSchema = {
  id: 'string (auto-generated)',
  userId: 'string',
  event: 'string',
  data: 'object',
  timestamp: 'string (ISO date)',
};

export const Indexes = [
  {
    collection: Collections.CAPTURES,
    fields: [
      ['userId', 'asc'],
      ['createdAt', 'desc'],
    ],
  },
  {
    collection: Collections.CAPTURES,
    fields: [
      ['userId', 'asc'],
      ['type', 'asc'],
      ['createdAt', 'desc'],
    ],
  },
  {
    collection: Collections.USERS,
    fields: [['email', 'asc']],
  },
  {
    collection: Collections.SUBSCRIPTIONS,
    fields: [
      ['userId', 'asc'],
      ['status', 'asc'],
    ],
  },
];

// Security rules live in the repo-root `firestore.rules` / `storage.rules` files
// (deployed via firebase.json). They are intentionally NOT duplicated here so
// there is exactly one source of truth.
