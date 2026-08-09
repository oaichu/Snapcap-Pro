#!/bin/bash
# Firebase Project Setup Script for SnapCap
# Run this after creating a Firebase project at https://console.firebase.google.com

set -e

echo "🔥 SnapCap Firebase Project Setup"
echo "=================================="

# ---------------------------------------------------------------------------
# PREFLIGHT
# ---------------------------------------------------------------------------
echo "🧪 Preflight checks..."

# 1. Firebase CLI must already be present. We do NOT silently `npm install -g`:
#    an unexpected CLI version is a configuration error, not something to mask.
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found."
    echo "   Install it explicitly, then re-run:  npm install -g firebase-tools"
    exit 1
fi
echo "  ✅ firebase CLI: $(firebase --version)"

# 2. Must be authenticated.
if ! firebase login:list 2>/dev/null | grep -qi '@'; then
    echo "❌ Not logged in to Firebase. Run: firebase login"
    exit 1
fi
echo "  ✅ authenticated"

# 3. Project ID must be supplied and selectable.
read -p "Enter your Firebase Project ID: " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Project ID is required"
    exit 1
fi

if ! firebase use "$PROJECT_ID" > /dev/null 2>&1; then
    echo "❌ Cannot select project '$PROJECT_ID' (does it exist and do you have access?)"
    exit 1
fi

# 4. Confirm the CLI really is pointed at the intended project before we touch rules.
ACTIVE_PROJECT="$(firebase use 2>/dev/null | tr -d '\r')"
echo "  ✅ active project: $ACTIVE_PROJECT"
case "$ACTIVE_PROJECT" in
    *"$PROJECT_ID"*) ;;
    *)
        echo "❌ Active project does not match '$PROJECT_ID' — aborting before any rules deploy"
        exit 1
        ;;
esac

echo "📋 Using project: $PROJECT_ID"

# ---------------------------------------------------------------------------
# SERVICES
# ---------------------------------------------------------------------------
# NOTE: the Firebase CLI has no "enable" verb for Auth, Firestore, Storage or
# Functions (earlier revisions of this script invoked four such commands that do
# not exist). Enabling these products is a Console/gcloud operation and must be
# done manually before running this script.
echo "🔧 Firebase services must be enabled manually in the Console:"
echo "   Authentication: https://console.firebase.google.com/project/$PROJECT_ID/authentication/providers"
echo "   Firestore:      https://console.firebase.google.com/project/$PROJECT_ID/firestore"
echo "   Storage:        https://console.firebase.google.com/project/$PROJECT_ID/storage"

# Configure Authentication providers
echo "🔐 Configuring Authentication..."
echo "  ⚠️  Please manually enable the Google provider in Firebase Console:"
echo "     https://console.firebase.google.com/project/$PROJECT_ID/authentication/providers"

# Configure Firestore indexes
# firestore.indexes.json is now a REVIEWED, TRACKED artifact. Only generate it when
# missing, so this script can never silently clobber the committed version.
echo "📊 Setting up Firestore indexes..."
if [ -f firestore.indexes.json ]; then
    echo "  ✅ firestore.indexes.json already present (tracked) — keeping it"
else
    cat > firestore.indexes.json << EOF
{
  "indexes": [
    {
      "collectionGroup": "captures",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "userId", "order": "ASCENDING"},
        {"fieldPath": "type", "order": "ASCENDING"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    }
  ]
}
EOF
    echo "  ✅ generated firestore.indexes.json"
fi

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

# ---------------------------------------------------------------------------
# DEPLOY SECURITY RULES + INDEXES
# ---------------------------------------------------------------------------
# Rules are NO LONGER generated here. firestore.rules and storage.rules are
# hand-authored, reviewed, version-controlled artifacts (deny-all client writes,
# owner-scoped reads). This script only deploys them via firebase.json.
#
# ROLLBACK: before deploying, record the CURRENT ruleset ID so it can be restored.
#   Firestore: firebase firestore:databases:list  /  Console > Firestore > Rules > History
#   Storage:   Console > Storage > Rules > History
#   Or via API: GET https://firebaserules.googleapis.com/v1/projects/$PROJECT_ID/releases
# Rolling back = re-releasing the previously recorded ruleset ID.
echo "🔒 Deploying security rules and indexes..."
echo "  ⚠️  Record the current ruleset ID now (see rollback notes in this script) before continuing."

for f in firebase.json firestore.rules storage.rules firestore.indexes.json; do
    if [ ! -f "$f" ]; then
        echo "❌ Missing required artifact: $f"
        exit 1
    fi
done

firebase deploy --only firestore:rules,firestore:indexes,storage --project=$PROJECT_ID

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