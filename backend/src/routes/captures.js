import { Router } from 'express';
import { getDb, getStorageInstance } from '../services/firebase.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
import { FieldValue } from 'firebase-admin/firestore';
import config from '../config.js';

const router = Router();

router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { type } = req.query;
    // Clamp/coerce query params: NaN, garbage, zero or negatives must never
    // reach the Firestore query builder (a NaN limit/offset throws at runtime).
    const parsedLimit = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20;
    const parsedOffset = parseInt(req.query.offset, 10);
    const offset = Number.isFinite(parsedOffset) && parsedOffset > 0 ? parsedOffset : 0;

    let query = db
      .collection('captures')
      .where('userId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset);

    if (type) {
      query = query.where('type', '==', type);
    }

    const snapshot = await query.get();

    const captures = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      captures,
      pagination: {
        limit,
        offset,
        total: captures.length,
      },
    });
  })
);

router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const db = getDb();
    const captureRef = db.collection('captures').doc(req.params.id);
    const captureDoc = await captureRef.get();

    if (!captureDoc.exists) {
      throw new AppError('Capture not found', 404);
    }

    const capture = captureDoc.data();

    if (capture.userId !== req.user.uid) {
      throw new AppError('Unauthorized access', 403);
    }

    res.json({
      id: captureDoc.id,
      ...capture,
    });
  })
);

router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const db = getDb();
    const storage = getStorageInstance();
    const captureRef = db.collection('captures').doc(req.params.id);
    const captureDoc = await captureRef.get();

    if (!captureDoc.exists) {
      throw new AppError('Capture not found', 404);
    }

    const capture = captureDoc.data();

    if (capture.userId !== req.user.uid) {
      throw new AppError('Unauthorized access', 403);
    }

    const batch = db.batch();
    const userRef = db.collection('users').doc(req.user.uid);

    batch.delete(captureRef);

    batch.update(userRef, {
      captureCount: FieldValue.increment(-1),
      storageUsedMB: FieldValue.increment(-(capture.sizeMB || 0)),
      updatedAt: new Date().toISOString(),
    });

    await batch.commit();

    if (capture.url) {
      const bucket = storage.bucket();
      const file = bucket.file(capture.url);
      await file.delete().catch(err => console.warn('Failed to delete GCS file:', err.message));
    }

    res.json({ message: 'Capture deleted successfully' });
  })
);

router.get(
  '/stats/summary',
  authenticate,
  asyncHandler(async (req, res) => {
    const db = getDb();

    const capturesSnapshot = await db
      .collection('captures')
      .where('userId', '==', req.user.uid)
      .get();

    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const subscription = userDoc.data()?.subscription || 'free';
    const limits = config.subscription[subscription];

    let totalSizeMB = 0;
    let imageCount = 0;
    let videoCount = 0;

    capturesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      totalSizeMB += data.sizeMB || 0;
      if (data.type === 'image') imageCount++;
      if (data.type === 'video') videoCount++;
    });

    res.json({
      total: capturesSnapshot.size,
      images: imageCount,
      videos: videoCount,
      storageUsedMB: Math.round(totalSizeMB * 100) / 100,
      limits: {
        maxCaptures: limits.maxCaptures,
        maxStorageMB: limits.maxStorageMB,
        maxRecordingSeconds: limits.maxRecordingSeconds,
      },
    });
  })
);

export default router;
