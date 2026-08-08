#!/bin/bash
# Firebase Project Setup Script for SnapCap
# Run this after creating a Firebase project at https://console.firebase.google.com

set -e

echo "🔥 SnapCap Firebase Project Setup"
echo "=================================="

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "📦 Installing Firebase CLI..."
    npm install -g firebase-tools
fi

# Login to Firebase
echo "🔐 Logging into Firebase..."
firebase login

# Get project ID from user
read -p "Enter your Firebase Project ID: " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Project ID is required"
    exit 1
fi

echo "📋 Using project: $PROJECT_ID"

# Set project
firebase use $PROJECT_ID

# Enable required services
echo "🔧 Enabling Firebase services..."

echo "  → Enabling Authentication..."
firebase auth:enable --project=$PROJECT_ID

echo "  → Enabling Firestore..."
firebase firestore:enable --project=$PROJECT_ID

echo "  → Enabling Storage..."
firebase storage:enable --project=$PROJECT_ID

echo "  → Enabling Functions..."
firebase functions:enable --project=$PROJECT_ID

# Configure Authentication providers
echo "🔐 Configuring Authentication..."

echo "  → Enabling Google Sign-In..."
# Note: This requires manual configuration in Firebase Console
echo "  ⚠️  Please manually enable Google provider in Firebase Console:"
echo "     https://console.firebase.google.com/project/$PROJECT_ID/authentication/providers"

# Configure Firestore indexes
echo "📊 Setting up Firestore indexes..."
cat > firestore.indexes.json << EOF
{
  "indexes": [
    {
      "collectionGroup": "captures",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "userId", "order": "ASCENDING"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "captures",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "userId", "order": "ASCENDING"},
        {"fieldPath": "type", "order": "ASCENDING"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "email", "order": "ASCENDING"}
      ]
    }
  ]
}
EOF

firebase firestore:indexes:deploy --project=$PROJECT_ID

# Configure Firestore TTL policy for expired captures
echo "⏰ Setting up Firestore TTL policy for expired captures..."
cat > firestore.ttl.json << EOF
{
  "ttlConfig": {
    "field": "expiresAt",
    "state": "ENABLED"
  }
}
EOF

# Note: TTL must be configured via gcloud or Firebase Console
echo "  ⚠️  TTL policy must be enabled via gcloud:"
echo "     gcloud firestore fields ttls update expiresAt --collection-group=captures --enable-ttl --project=$PROJECT_ID"

# Deploy Firestore rules
echo "🔒 Deploying Firestore security rules..."
cat > firestore.rules << 'EOF'
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
      allow write: if isAuthenticated();
    }
    
    match /analytics/{analyticsId} {
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow read, update, delete: if false;
    }
  }
}
EOF

firebase deploy --only firestore:rules --project=$PROJECT_ID

# Deploy Storage rules
echo "🔒 Deploying Storage security rules..."
cat > storage.rules << 'EOF'
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
EOF

firebase deploy --only storage --project=$PROJECT_ID

# Deploy Cloud Functions for cleanup
echo "☁️  Deploying Cloud Functions for expired captures cleanup..."
mkdir -p functions
cat > functions/package.json << 'EOF'
{
  "name": "snapcap-functions",
  "description": "SnapCap Cloud Functions",
  "scripts": {
    "serve": "firebase emulators:start --only functions",
    "shell": "firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "engines": {
    "node": "20"
  },
  "main": "index.js",
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0"
  },
  "devDependencies": {
    "eslint": "^8.56.0"
  },
  "private": true
}
EOF

cat > functions/index.js << 'EOF'
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { exec } = require("child_process");
const { promisify } = require("util");

initializeApp();
const db = getFirestore();
const storage = getStorage();

const execAsync = promisify(exec);

async function scanFileWithClamAV(filePath) {
  try {
    const bucket = storage.bucket();
    const file = bucket.file(filePath);
    const [buffer] = await file.download();
    
    const { stdout, stderr } = await execAsync(`clamdscan --fdpass -`, {
      input: buffer,
      maxBuffer: 100 * 1024 * 1024
    });
    
    if (stdout.includes('FOUND') || stderr.includes('FOUND')) {
      const threatMatch = stdout.match(/FOUND: (.+)/) || stderr.match(/FOUND: (.+)/);
      const threat = threatMatch ? threatMatch[1] : 'Unknown threat';
      return { clean: false, threat };
    }
    
    return { clean: true };
  } catch (err) {
    if (err.code === 1) {
      const threatMatch = err.stdout?.match(/FOUND: (.+)/) || err.stderr?.match(/FOUND: (.+)/);
      const threat = threatMatch ? threatMatch[1] : 'Unknown threat';
      return { clean: false, threat };
    }
    console.warn('ClamAV scan failed:', err.message);
    return { clean: true, error: err.message };
  }
}

exports.cleanupExpiredCaptures = onSchedule({
  schedule: "every 24 hours",
  timeZone: "UTC",
  region: "us-central1"
}, async (event) => {
  const now = new Date();
  const expiredRef = db.collection("captures")
    .where("expiresAt", "<", now.toISOString());
  
  const snapshot = await expiredRef.get();
  if (snapshot.empty) {
    console.log("No expired captures to clean up");
    return;
  }

  const batch = db.batch();
  const filesToDelete = [];
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    batch.delete(doc.ref);
    if (data.url) {
      filesToDelete.push(data.url);
    }
  });

  await batch.commit();
  console.log(`Deleted ${snapshot.size} expired capture documents`);

  const bucket = storage.bucket();
  for (const filePath of filesToDelete) {
    try {
      await bucket.file(filePath).delete();
      console.log(`Deleted GCS file: ${filePath}`);
    } catch (err) {
      console.warn(`Failed to delete GCS file ${filePath}:`, err.message);
    }
  }
});

exports.scanUploadedFile = onObjectFinalized({
  bucket: process.env.STORAGE_BUCKET || '',
  region: "us-central1"
}, async (event) => {
  const filePath = event.data.name;
  
  if (!filePath.startsWith('captures/')) {
    return;
  }

  console.log(`Scanning uploaded file: ${filePath}`);
  const result = await scanFileWithClamAV(filePath);
  
  if (!result.clean) {
    console.error(`MALWARE DETECTED in ${filePath}: ${result.threat}`);
    
    const bucket = storage.bucket();
    await bucket.file(filePath).delete();
    console.log(`Deleted infected file: ${filePath}`);
    
    const captureRef = db.collection('captures').where('url', '==', filePath).limit(1);
    const snapshot = await captureRef.get();
    if (!snapshot.empty) {
      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      console.log('Deleted associated capture document');
    }
    
    return;
  }
  
  console.log(`File ${filePath} is clean`);
});
EOF

firebase deploy --only functions --project=$PROJECT_ID

# Create service account key
echo "🔑 Creating service account key..."
echo "⚠️  Please manually create a service account key in Firebase Console:"
echo "   https://console.firebase.google.com/project/$PROJECT_ID/settings/serviceaccounts/adminsdk"
echo "   Save as: backend/serviceAccountKey.json"

# Get Firebase config for frontend
echo "📋 Getting Firebase config for extension..."
echo "   Get config from: https://console.firebase.google.com/project/$PROJECT_ID/settings/general/"
echo "   Add to extension/config.js"

echo ""
echo "✅ Firebase setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Add serviceAccountKey.json to backend/"
echo "2. Update extension/config.js with Firebase config"
echo "3. Configure Google Auth provider in Firebase Console"
echo "4. Test authentication flow"
echo "5. Enable TTL policy: gcloud firestore fields ttls update expiresAt --collection-group=captures --enable-ttl --project=$PROJECT_ID"
echo "6. Deploy backend: ./deploy.sh"