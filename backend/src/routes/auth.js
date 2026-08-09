import { Router } from 'express';
import { getAdmin, getDb } from '../services/firebase.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const admin = getAdmin();
    const userRecord = await admin.auth().getUser(req.user.uid);

    const db = getDb();
    const userDoc = await db.collection('users').doc(req.user.uid).get();

    res.json({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      emailVerified: userRecord.emailVerified,
      createdAt: userRecord.metadata.creationTime,
      subscription: userDoc.exists ? userDoc.data().subscription : 'free',
    });
  })
);

router.post(
  '/sync',
  authenticate,
  asyncHandler(async (req, res) => {
    const { uid, email, displayName, photoURL } = req.body;

    if (uid !== req.user.uid) {
      throw new AppError('UID mismatch', 403);
    }

    const db = getDb();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      await userRef.set({
        email,
        displayName: displayName || '',
        photoURL: photoURL || '',
        subscription: 'free',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        captureCount: 0,
        storageUsedMB: 0,
      });
    } else {
      await userRef.update({
        email,
        displayName: displayName || '',
        photoURL: photoURL || '',
        updatedAt: new Date().toISOString(),
      });
    }

    const updatedDoc = await userRef.get();
    res.json({
      message: 'User synced successfully',
      user: updatedDoc.data(),
    });
  })
);

router.delete(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const admin = getAdmin();
    const db = getDb();

    await admin.auth().deleteUser(req.user.uid);

    const userRef = db.collection('users').doc(req.user.uid);
    const capturesRef = db.collection('captures').where('userId', '==', req.user.uid);

    const captures = await capturesRef.get();
    const batch = db.batch();

    captures.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    batch.delete(userRef);
    await batch.commit();

    res.json({ message: 'User account deleted successfully' });
  })
);

export default router;
