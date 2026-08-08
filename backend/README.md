# SnapCap Backend API

Backend API for SnapCap Chrome Extension - Firebase-based cloud infrastructure.

## Prerequisites

- Node.js 20+
- Firebase Account (https://firebase.google.com)
- Firebase CLI (optional)

## Setup Instructions

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable the following services:
   - **Authentication** (Google Sign-In)
   - **Cloud Firestore**
   - **Cloud Storage**

### 2. Get Firebase Configuration

1. Go to Project Settings → General → Your apps
2. Add a Web App (</>) to your project
3. Copy the Firebase config object

### 3. Generate Service Account Key

1. Go to Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save the JSON file as `serviceAccountKey.json` in the backend folder

### 4. Configure Environment Variables

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your Firebase configuration values.

### 5. Install Dependencies

```bash
npm install
```

### 6. Run Development Server

```bash
npm run dev
```

Server will start on http://localhost:3000

### 7. Run Production Server

```bash
npm start
```

## API Endpoints

### Authentication
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/sync` - Sync user data
- `DELETE /api/auth/me` - Delete user account

### Captures
- `GET /api/captures` - List user captures
- `GET /api/captures/:id` - Get capture details
- `DELETE /api/captures/:id` - Delete capture
- `GET /api/captures/stats/summary` - Get capture statistics

### Upload
- `POST /api/upload/image` - Upload image capture
- `POST /api/upload/video` - Upload video capture

### Subscription
- `GET /api/subscription` - Get subscription details
- `POST /api/subscription/upgrade` - Upgrade to Pro
- `POST /api/subscription/cancel` - Cancel subscription
- `GET /api/subscription/features` - Get available features

## Firestore Collections

### Users
```
users/{uid} {
  uid: string
  email: string
  displayName: string
  photoURL: string
  subscription: 'free' | 'pro'
  captureCount: number
  storageUsedMB: number
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Captures
```
captures/{id} {
  userId: string
  type: 'image' | 'video'
  url: string (storage path)
  sizeMB: number
  createdAt: timestamp
  expiresAt: timestamp
}
```

### Subscriptions
```
subscriptions/{id} {
  userId: string
  plan: 'free' | 'pro'
  status: 'active' | 'cancelled'
  paymentMethodId: string
  createdAt: timestamp
}
```

## Storage Structure

```
captures/{userId}/{filename}
```

## Security Rules

See `src/services/schema.js` for Firestore and Storage security rules.

## Deployment

### Deploy to Firebase Cloud Functions

```bash
firebase login
firebase init functions
firebase deploy --only functions
```

### Deploy to Vercel

```bash
vercel
```

### Deploy to AWS/GCP

Use your preferred deployment method for Node.js applications.

## Testing

```bash
npm test
```

## License

MIT
