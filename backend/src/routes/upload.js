import { Router } from 'express';
import { getStorageInstance, getDb } from '../services/firebase.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { FieldValue } from 'firebase-admin/firestore';
import config from '../config.js';

const router = Router();

const PRO_FEATURES = {
  full_page_capture: 'full_page_capture',
  screen_recording: 'screen_recording',
  blur_redaction: 'blur_redaction',
};

function requireProFeature(subscription, feature) {
  if (subscription !== 'pro' && config.subscription.free.features.includes(feature) === false) {
    throw new AppError('This feature is currently unavailable.', 403);
  }
}

async function uploadCapture(req, res, captureType, contentType, extension, feature) {
  const { dataUrl, blob } = req.body;
  const bodyData = captureType === 'image' ? dataUrl : blob;

  if (!bodyData) {
    throw new AppError(`${captureType === 'image' ? 'dataUrl' : 'blob'} is required`, 400);
  }

  // Fail fast BEFORE any DB/storage work: a malformed payload must 400, never
  // silently save a 0-byte file. (Before, bodyData without a comma produced
  // `undefined` -> Buffer.from(undefined) -> an empty buffer that was uploaded
  // and recorded as a real capture.)
  const expectedPrefix = 'data:' + contentType + ';';
  if (typeof bodyData !== 'string' || !bodyData.startsWith(expectedPrefix)) {
    throw new AppError(`Payload must be a data:${contentType} data URL`, 400);
  }
  const base64Part = bodyData.slice(expectedPrefix.length);
  if (!base64Part || !base64Part.startsWith('base64,')) {
    throw new AppError('Payload must be base64-encoded', 400);
  }
  const buffer = Buffer.from(base64Part.slice('base64,'.length), 'base64');
  if (buffer.length === 0) {
    throw new AppError('Empty payload', 400);
  }
  const sizeMB = buffer.length / (1024 * 1024);

  const db = getDb();
  const userRef = db.collection('users').doc(req.user.uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new AppError('User not found', 404);
  }

  const userData = userDoc.data();
  const subscription = userData.subscription || 'free';
  const limits = config.subscription[subscription];

  requireProFeature(subscription, feature);

  const capturesSnapshot = await db
    .collection('captures')
    .where('userId', '==', req.user.uid)
    .get();

  if (capturesSnapshot.size >= limits.maxCaptures) {
    throw new AppError(
      'Capture limit reached. Please delete some existing captures and try again.',
      403
    );
  }

  if (sizeMB > config.storage.maxFileSize / (1024 * 1024)) {
    throw new AppError('File size exceeds maximum allowed size', 400);
  }

  if ((userData.storageUsedMB || 0) + sizeMB > limits.maxStorageMB) {
    throw new AppError(
      `Storage limit reached. Please delete some existing captures and try again.`,
      403
    );
  }

  const storage = getStorageInstance();
  const filename = `captures/${req.user.uid}/${uuidv4()}.${extension}`;

  const bucket = storage.bucket();
  const file = bucket.file(filename);

  await file.save(buffer, {
    metadata: {
      contentType,
      metadata: {
        userId: req.user.uid,
        type: captureType,
      },
    },
  });

  // Signed URL lifetime matches the capture document expiry (30 days) so users
  // never lose access to a capture that still exists.
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });

  const batch = db.batch();
  const captureRef = db.collection('captures').doc();

  batch.set(captureRef, {
    userId: req.user.uid,
    type: captureType,
    url: filename,
    sizeMB: Math.round(sizeMB * 100) / 100,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  batch.update(userRef, {
    captureCount: FieldValue.increment(1),
    storageUsedMB: FieldValue.increment(Math.round(sizeMB * 100) / 100),
    updatedAt: new Date().toISOString(),
  });

  await batch.commit();

  res.json({
    id: captureRef.id,
    url: url,
    sizeMB: Math.round(sizeMB * 100) / 100,
    message: `${captureType === 'image' ? 'Image' : 'Video'} uploaded successfully`,
  });
}

router.post(
  '/image',
  authenticate,
  asyncHandler(async (req, res) => {
    await uploadCapture(req, res, 'image', 'image/png', 'png', PRO_FEATURES.full_page_capture);
  })
);

router.post(
  '/video',
  authenticate,
  asyncHandler(async (req, res) => {
    await uploadCapture(req, res, 'video', 'video/webm', 'webm', PRO_FEATURES.screen_recording);
  })
);

export default router;
