// Unit test for the REAL upload route handlers (backend/src/routes/upload.js).
// The data-URL validation runs BEFORE getDb() is reached, so the handler can be
// invoked directly without Firebase: invalid payloads must produce a 400
// AppError, while valid payloads must get PAST validation (they then fail at
// getDb() with "Firebase not initialized" — which is the proof they passed).
import uploadRoutes from '/home/oaichu/open-capture-extension/backend/src/routes/upload.js';

function findHandler(path) {
  const layer = uploadRoutes.stack.find(l => l.route && l.route.path === path && l.route.methods.post);
  if (!layer || !layer.route.stack[1]) {
    console.error('handler not found for ' + path);
    process.exit(2);
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

const results = [];
function check(name, got, expectedStatus, expectedMessage) {
  const status = got.err ? got.err.statusCode : null;
  const message = got.err ? String(got.err.message || '') : '';
  const ok =
    got.kind === 'error' &&
    status === expectedStatus &&
    (expectedMessage === null || message.includes(expectedMessage));
  results.push({ name, ok, status, message });
  console.log(
    (ok ? 'PASS' : 'FAIL') +
      ' | ' +
      name +
      ' | status=' +
      status +
      ' msg="' +
      message +
      '"'
  );
}

// 1. Garbage payload → 400 (before, this silently saved a 0-byte file)
let r = await call(imageHandler, { dataUrl: 'not-a-data-url' });
check('garbage image payload rejected 400', r, 400, 'data:image/png data URL');

// 2. Valid PNG data URL → passes validation (fails later at getDb = no Firebase)
r = await call(imageHandler, { dataUrl: 'data:image/png;base64,iVBORw0KGgo=' });
check('valid PNG data URL passes validation', r, undefined, 'Firebase not initialized');

// 3. Empty base64 body → 400 "Empty payload"
r = await call(imageHandler, { dataUrl: 'data:image/png;base64,' });
check('empty base64 rejected 400', r, 400, 'Empty payload');

// 4. Video route with an image-typed payload → 400 (content-type mismatch)
r = await call(videoHandler, { blob: 'data:image/png;base64,iVBORw0KGgo=' });
check('wrong content-type on video route rejected 400', r, 400, 'data:video/webm data URL');

// 5. Valid WebM data URL → passes validation
r = await call(videoHandler, { blob: 'data:video/webm;base64,GkXfo0AgQoaBAUL3gQFC8oEEQvOBCA===' });
check('valid WebM data URL passes validation', r, undefined, 'Firebase not initialized');

// 6. Missing body field → 400
r = await call(imageHandler, {});
check('missing dataUrl rejected 400', r, 400, 'dataUrl');

const failed = results.filter(x => !x.ok);
console.log(
  '\n===== SUMMARY =====\nPassed ' +
    (results.length - failed.length) +
    '/' +
    results.length +
    ' | ' +
    (failed.length === 0 ? 'ALL PASS' : 'FAILURES: ' + failed.map(f => f.name).join('; '))
);
process.exit(failed.length === 0 ? 0 : 1);
