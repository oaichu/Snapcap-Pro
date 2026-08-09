import { Router } from 'express';
import { getDb } from '../services/firebase.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
import config from '../config.js';

const router = Router();

router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const db = getDb();
    const userDoc = await db.collection('users').doc(req.user.uid).get();

    if (!userDoc.exists) {
      throw new AppError('User not found', 404);
    }

    const userData = userDoc.data();
    const subscription = userData.subscription || 'free';
    const limits = config.subscription[subscription];

    res.json({
      subscription,
      limits,
      usage: {
        captureCount: userData.captureCount || 0,
        storageUsedMB: userData.storageUsedMB || 0,
      },
    });
  })
);

router.post(
  '/cancel',
  authenticate,
  asyncHandler(async (req, res) => {
    const db = getDb();
    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new AppError('User not found', 404);
    }

    await userRef.update({
      subscription: 'free',
      cancelledAt: new Date().toISOString(),
    });

    res.json({
      message: 'Subscription cancelled successfully. You are now on the Free plan.',
    });
  })
);

router.get(
  '/features',
  authenticate,
  asyncHandler(async (req, res) => {
    const db = getDb();
    const userDoc = await db.collection('users').doc(req.user.uid).get();

    if (!userDoc.exists) {
      throw new AppError('User not found', 404);
    }

    const subscription = userDoc.data().subscription || 'free';
    const features = config.subscription[subscription].features;

    res.json({
      subscription,
      features,
      allFeatures: {
        free: config.subscription.free.features,
        pro: config.subscription.pro.features,
      },
    });
  })
);

export default router;
