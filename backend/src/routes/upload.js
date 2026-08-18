import { Router } from 'express';
import { getStorageInstance, getDb } from '../services/firebase.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { FieldValue } from 'firebase-admin/firestore';
import config from '../config.js';

const router = Router();

// Constants
const MAX_FILE_SIZE_MB = config.storage.maxFileSize / (1024 * 1024);
const CAPTURE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Validates and processes capture upload
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {'image' | 'video'} captureType - Type of capture
 * @param {string} contentType - MIME type
 * @param {string} extension - File extension
 */
async function uploadCapture(req, res, captureType, contentType, extension) {
  const { dataUrl, blob } = req.body;
  const bodyData = captureType === 'image' ? dataUrl : blob;
  const fieldName = captureType === 'image' ? 'dataUrl' : 'blob';

  if (!bodyData) {
    throw new AppError(`${fieldName} is required`, 400);
  }

  // Validate payload format BEFORE any DB/storage work
  const expectedPrefix = `data:${contentType};`;
  if (typeof bodyData !== 'string' || !bodyData.startsWith(expectedPrefix)) {
    throw new AppError(`Payload must be a ${contentType} data URL`, 400);
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

  // Check capture limit
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

  // Validate file size using extracted constant
  if (sizeMB > MAX_FILE_SIZE_MB) {
    throw new AppError('File size exceeds maximum allowed size', 400);
  }

  // Check storage quota
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

  // Signed URL lifetime matches the capture document expiry (30 days)
  const expiresAt = Date.now() + CAPTURE_EXPIRY_MS;
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: expiresAt,
  });

  const batch = db.batch();
  const captureRef = db.collection('captures').doc();

  batch.set(captureRef, {
    userId: req.user.uid,
    type: captureType,
    url: filename,
    sizeMB: Math.round(sizeMB * 100) / 100,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
  });

  batch.update(userRef, {
    captureCount: FieldValue.increment(1),
    storageUsedMB: FieldValue.increment(Math.round(sizeMB * 100) / 100),
    updatedAt: new Date().toISOString(),
  });

  await batch.commit();

  res.json({
    id: captureRef.id,
    url,
    sizeMB: Math.round(sizeMB * 100) / 100,
    message: `${captureType === 'image' ? 'Image' : 'Video'} uploaded successfully`,
  });
}

router.post(
  '/image',
  authenticate,
  asyncHandler(async (req, res) => {
    await uploadCapture(req, res, 'image', 'image/png', 'png');
  })
);

router.post(
  '/video',
  authenticate,
  asyncHandler(async (req, res) => {
    await uploadCapture(req, res, 'video', 'video/webm', 'webm');
  })
);

export default router;
