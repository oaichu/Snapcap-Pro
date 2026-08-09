import { getAdmin } from '../services/firebase.js';
import { AppError } from './errorHandler.js';

export function createUserMiddleware(req, res, next) {
  (async () => {
    try {
      const { uid, email, displayName, photoURL } = req.body;

      if (!uid || !email) {
        throw new AppError('uid and email are required', 400);
      }

      const admin = getAdmin();

      try {
        const userRecord = await admin.auth().getUser(uid);
        req.userRecord = userRecord;
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          const newUser = await admin.auth().createUser({
            uid,
            email,
            displayName: displayName || '',
            photoURL: photoURL || '',
          });
          req.userRecord = newUser;
        } else {
          throw error;
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  })();
}
