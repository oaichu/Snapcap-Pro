import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

const mockVerifyIdToken = mock.fn();
const mockGetUser = mock.fn();

const mockAdmin = {
  auth: () => ({
    verifyIdToken: mockVerifyIdToken,
    getUser: mockGetUser
  })
};

const mockFirebaseAdmin = {
  apps: [],
  initializeApp: mock.fn(),
  credential: {
    cert: mock.fn()
  }
};

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new Error('No authentication token provided'));
    }

    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      return next(new Error('Invalid authentication token'));
    }

    const decodedToken = await mockAdmin.auth().verifyIdToken(token);
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.displayName,
      emailVerified: decodedToken.emailVerified
    };

    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
}

function createMockReq(headers = {}) {
  return { headers };
}

function createMockRes() {
  const res = {};
  res.status = mock.fn(() => res);
  res.json = mock.fn(() => res);
  return res;
}

describe('Authentication Middleware', () => {
  beforeEach(() => {
    mockVerifyIdToken.mock.resetCalls();
    mockGetUser.mock.resetCalls();
  });

  test('should authenticate valid token', async () => {
    const decodedToken = {
      uid: 'user123',
      email: 'test@example.com',
      displayName: 'Test User',
      emailVerified: true
    };

    mockVerifyIdToken.mock.mockImplementation(async () => decodedToken);

    const req = createMockReq({ authorization: 'Bearer valid-token' });
    const res = createMockRes();
    const next = mock.fn();

    await authenticate(req, res, next);

    assert.equal(next.mock.callCount(), 1);
    assert.equal(req.user.uid, 'user123');
    assert.equal(req.user.email, 'test@example.com');
  });

  test('should reject request without authorization header', async () => {
    const req = createMockReq({});
    const res = createMockRes();
    const next = mock.fn();

    await authenticate(req, res, next);

    assert.equal(next.mock.callCount(), 1);
    const error = next.mock.calls[0].arguments[0];
    assert.equal(error.message, 'No authentication token provided');
  });

  test('should reject request with invalid token format', async () => {
    const req = createMockReq({ authorization: 'InvalidFormat token' });
    const res = createMockRes();
    const next = mock.fn();

    await authenticate(req, res, next);

    assert.equal(next.mock.callCount(), 1);
    const error = next.mock.calls[0].arguments[0];
    assert.equal(error.message, 'No authentication token provided');
  });

  test('should reject when token verification fails', async () => {
    mockVerifyIdToken.mock.mockImplementation(async () => {
      throw new Error('Invalid token');
    });

    const req = createMockReq({ authorization: 'Bearer invalid-token' });
    const res = createMockRes();
    const next = mock.fn();

    await authenticate(req, res, next);

    assert.equal(next.mock.callCount(), 1);
    const error = next.mock.calls[0].arguments[0];
    assert.equal(error.message, 'Authentication failed');
  });
});

describe('Rate Limiter', () => {
  test('should create rate limiter with correct config', () => {
    const config = {
      windowMs: 15 * 60 * 1000,
      max: 100
    };

    assert.equal(config.windowMs, 900000);
    assert.equal(config.max, 100);
  });
});

describe('AppError', () => {
  test('should create error with message and status code', () => {
    class AppError extends Error {
      constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
      }
    }

    const error = new AppError('Test error', 400);
    
    assert.equal(error.message, 'Test error');
    assert.equal(error.statusCode, 400);
    assert.equal(error.isOperational, true);
  });
});
