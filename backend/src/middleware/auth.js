import { getAdmin } from '../services/firebase.js';
import { AppError } from './errorHandler.js';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No authentication token provided', 401);
    }

    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      throw new AppError('Invalid authentication token', 401);
    }

    const admin = getAdmin();
    const decodedToken = await admin.auth().verifyIdToken(token);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.displayName,
      photoURL: decodedToken.photoURL,
      emailVerified: decodedToken.emailVerified,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    if (error.code === 'auth/expired-token') {
      return next(new AppError('Authentication token expired', 401));
    }

    if (error.code === 'auth/invalid-token') {
      return next(new AppError('Invalid authentication token', 401));
    }

    return next(new AppError('Authentication failed', 401));
  }
}
