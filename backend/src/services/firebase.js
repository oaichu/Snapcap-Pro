import admin from 'firebase-admin';
import config from '../config.js';

let firebaseAdmin;

/**
 * Initialize the Firebase Admin SDK (server-side).
 * Uses firebase-admin for BOTH Firestore and Cloud Storage (correct for Node).
 */
export function initializeFirebase() {
  try {
    if (!admin.apps.length) {
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(config.firebase.serviceAccount),
        projectId: config.firebase.projectId,
        storageBucket: config.firebase.storageBucket,
      });
    } else {
      firebaseAdmin = admin.apps[0];
    }
    console.log('Firebase initialized successfully (firebase-admin)');
    return firebaseAdmin;
  } catch (error) {
    console.error('Firebase initialization error:', error.message);
    throw error;
  }
}

export function getDb() {
  if (!firebaseAdmin) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return firebaseAdmin.firestore();
}

export function getStorageInstance() {
  if (!firebaseAdmin) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return firebaseAdmin.storage();
}

export function getAdmin() {
  if (!firebaseAdmin) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return firebaseAdmin;
}

export { firebaseAdmin };
