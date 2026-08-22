import { describe, it } from 'node:test';
import assert from 'node:assert';
import uploadRoutes from '../../src/routes/upload.js';

function findHandler(path) {
  const layer = uploadRoutes.stack.find(
    l => l.route && l.route.path === path && l.route.methods.post
  );
  if (!layer || !layer.route.stack[1]) {
    throw new Error('handler not found for ' + path);
  }
  return layer.route.stack[1].handle;
}

const imageHandler = findHandler('/image');
const videoHandler = findHandler('/video');

function call(handler, body) {
  const req = { body, user: { uid: 'user-1' } };
  return new Promise(resolve => {
    const res = { json: () => resolve({ kind: 'json' }) };
    handler(req, res, err => resolve({ kind: 'error', err }));
  });
}

describe('Upload Route Validation Unit Tests', () => {
  it('should reject garbage image payload with 400', async () => {
    const res = await call(imageHandler, { dataUrl: 'not-a-data-url' });
    assert.strictEqual(res.kind, 'error');
    assert.strictEqual(res.err.statusCode, 400);
    assert.ok(res.err.message.includes('data:image/png data URL'));
  });

  it('should validate valid PNG data URL structure', async () => {
    const res = await call(imageHandler, {
      dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
    });
    assert.strictEqual(res.kind, 'error');
    // Passes validation and fails later at getDb because Firebase is uninitialized in test
    assert.ok(res.err.message.includes('Firebase not initialized'));
  });

  it('should reject empty base64 image with 400', async () => {
    const res = await call(imageHandler, { dataUrl: 'data:image/png;base64,' });
    assert.strictEqual(res.kind, 'error');
    assert.strictEqual(res.err.statusCode, 400);
    assert.ok(res.err.message.includes('Empty payload'));
  });

  it('should reject wrong content-type on video route with 400', async () => {
    const res = await call(videoHandler, {
      blob: 'data:image/png;base64,iVBORw0KGgo=',
    });
    assert.strictEqual(res.kind, 'error');
    assert.strictEqual(res.err.statusCode, 400);
    assert.ok(res.err.message.includes('data:video/webm data URL'));
  });

  it('should validate valid WebM data URL structure', async () => {
    const res = await call(videoHandler, {
      blob: 'data:video/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwEAAAA=',
    });
    assert.strictEqual(res.kind, 'error');
    assert.ok(res.err.message.includes('Firebase not initialized'));
  });

  it('should reject missing blob on video route with 400', async () => {
    const res = await call(videoHandler, {});
    assert.strictEqual(res.kind, 'error');
    assert.strictEqual(res.err.statusCode, 400);
    assert.ok(res.err.message.includes('blob is required'));
  });
});
