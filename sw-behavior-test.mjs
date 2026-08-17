// Behavioral test for background/service_worker.js recording flow.
// Loads the real SW source in a VM with a stubbed `chrome` API, drives the
// full lifecycle (START_RECORDING -> RECORDING state -> badge -> STOP ->
// RECORDING_COMPLETE) and asserts the in-page badge is addressed at the tab
// that the popup reported.
//
// Usage:
//   EXPECT_BADGE=1 node sw-behavior-test.mjs <path-to-service_worker.js>   # fixed code
//   EXPECT_BADGE=0 node sw-behavior-test.mjs <path-to-service_worker.js>   # pre-fix code
import fs from 'fs';
import vm from 'vm';

const file = process.argv[2];
const expectBadge = process.env.EXPECT_BADGE === '1';
const code = fs.readFileSync(file, 'utf8');

const sleep = ms => new Promise(r => setTimeout(r, ms));

let messageListener = null;
let startedBadge = null;
let stoppedBadge = null;
let offscreenStopAcked = 0;
let offscreenCreateCount = 0;
let offscreenCloseCount = 0;
let sessionTabSeen = null;
let openEditorUrl = null;
const sentMessages = [];
const createdOffscreen = { created: false };

const chrome = {
  storage: {
    local: {
      data: {},
      async get(keys) {
        const res = {};
        const arr = Array.isArray(keys) ? keys : [keys];
        for (const k of arr) res[k] = this.data[k];
        return res;
      },
      async set(obj) {
        Object.assign(this.data, obj);
        return true;
      },
      async remove(keys) {
        const arr = Array.isArray(keys) ? keys : [keys];
        for (const k of arr) delete this.data[k];
        return true;
      },
    },
  },
  runtime: {
    async getContexts(query) {
      const contexts = [];
      if (createdOffscreen.created && query.contextTypes.includes('OFFSCREEN_DOCUMENT')) {
        contexts.push({ contextType: 'OFFSCREEN_DOCUMENT', documentUrl: 'chrome-extension://test/offscreen/offscreen.html' });
      }
      return contexts;
    },
    getURL(p) {
      return 'chrome-extension://test/' + p;
    },
    async getPlatformInfo() {
      return { os: 'linux' };
    },
    onMessage: { addListener(fn) { messageListener = fn; } },
    onStartup: { addListener() {} },
    onInstalled: { addListener() {} },
    async sendMessage(msg) {
      sentMessages.push(msg);
      if (msg && msg.target === 'offscreen') {
        if (msg.action === 'OFFSCREEN_PING') {
          return { action: 'OFFSCREEN_PONG', target: 'sw', recording: false, saving: false };
        }
        if (msg.action === 'OFFSCREEN_START_RECORDING') {
          return { status: 'recording_starting' };
        }
        if (msg.action === 'OFFSCREEN_STOP_RECORDING') {
          offscreenStopAcked++;
          return { action: 'STOP_ACK', target: 'sw' };
        }
      }
      return undefined;
    },
  },
  tabs: {
    async query() {
      return [{ id: 7, active: true, currentWindow: true }];
    },
    async sendMessage(tabId, msg) {
      if (msg.action === 'SHOW_RECORD_BADGE') startedBadge = { tabId, duration: msg.duration };
      if (msg.action === 'HIDE_RECORD_BADGE') stoppedBadge = { tabId };
      return { status: 'ok' };
    },
    async create(opts) {
      openEditorUrl = opts && opts.url;
      return {};
    },
  },
  offscreen: {
    async createDocument() {
      offscreenCreateCount++;
      createdOffscreen.created = true;
      return true;
    },
    async closeDocument() {
      offscreenCloseCount++;
      createdOffscreen.created = false;
      return true;
    },
  },
  downloads: { async download() {} },
};

const sandbox = {
  chrome,
  console,
  crypto: { randomUUID: () => 'uuid-' + Math.random().toString(36).slice(2) },
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Promise,
  Date,
  Math,
  JSON,
  OffscreenCanvas: class {},
  createImageBitmap: async () => ({}),
  fetch: async () => ({ blob: async () => new Blob() }),
  Blob,
  FileReader: class {},
};

vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: 'service_worker.js' });
await sleep(150); // let the top-level reconcileSession('sw-wake') settle

// Wait for the message handler's async response when it returns true; resolve
// immediately for fire-and-forget handlers (they never call sendResponse).
function send(msg) {
  return new Promise(resolve => {
    let settled = false;
    const finish = r => {
      if (!settled) {
        settled = true;
        resolve(r);
      }
    };
    const ret = messageListener(msg, {}, r => finish({ res: r }));
    if (ret !== true) finish({ res: undefined });
  });
}

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + (detail ? ' | ' + detail : ''));
}

// ---------------------------------------------------------------------------
// 1. START_RECORDING (popup relays stream id + the tab it is showing)
// ---------------------------------------------------------------------------
await send({ action: 'START_RECORDING', target: 'sw', streamId: 'stream-abc', canRequestAudioTrack: true, duration: 15, mic: false, tabId: 42 });
await sleep(600); // offscreen warm-up + relay + badge

// 2. Session must be RECORDING and carry the reported tab
const state1 = await send({ action: 'GET_RECORDING_STATE', target: 'sw' });
check('session becomes RECORDING', state1.res && state1.res.state === 'recording', JSON.stringify(state1.res));
check('session carries tabId 42', state1.res && state1.res.tabId === 42, 'tabId=' + (state1.res && state1.res.tabId));
sessionTabSeen = state1.res && state1.res.tabId;

// 3. The in-page badge MUST be sent to tab 42 (the fix under test)
check(
  'in-page badge shown at tab 42',
  expectBadge ? !!(startedBadge && startedBadge.tabId === 42) : startedBadge === null,
  startedBadge ? 'badge sent to tab ' + startedBadge.tabId : 'no badge sent'
);

// 4. Badge must carry the recording duration
check('badge carries duration', expectBadge ? startedBadge && startedBadge.duration === 15 : true, startedBadge && 'duration=' + startedBadge.duration);

// ---------------------------------------------------------------------------
// 5. STOP -> offscreen ACK -> offscreen reports RECORDING_COMPLETE
// ---------------------------------------------------------------------------
await send({ action: 'STOP_RECORDING_TRIGGER', target: 'sw', source: 'test' });
await sleep(300);
const stopMsgs = sentMessages.filter(m => m && m.action === 'OFFSCREEN_STOP_RECORDING');
check('stop reached the offscreen recorder', stopMsgs.length >= 1, 'stops sent=' + stopMsgs.length);

// Simulate the offscreen document finishing: save done -> RECORDING_COMPLETE
await send({ action: 'RECORDING_COMPLETE', target: 'sw', id: 'vid_test', blobSize: 12345 });
await sleep(300);

const state2 = await send({ action: 'GET_RECORDING_STATE', target: 'sw' });
check('recording delivered to editor when popup closed', openEditorUrl && openEditorUrl.includes('editor.html') && openEditorUrl.includes('vid_test'), openEditorUrl || 'no editor URL');
check('session returns to IDLE after completion', state2.res && state2.res.state === 'idle', JSON.stringify(state2.res));
check('badge hidden on the session tab', expectBadge ? stoppedBadge && stoppedBadge.tabId === 42 : true, stoppedBadge && 'hidden on tab ' + stoppedBadge.tabId);
check('offscreen document closed', offscreenCloseCount >= 1, 'closes=' + offscreenCloseCount);

// ---------------------------------------------------------------------------
// 6. Fallback: START_RECORDING WITHOUT tabId must use the active tab (7)
// ---------------------------------------------------------------------------
await send({ action: 'START_RECORDING', target: 'sw', streamId: 'stream-xyz', canRequestAudioTrack: false, duration: 10, mic: false, tabId: null });
await sleep(600);
const state3 = await send({ action: 'GET_RECORDING_STATE', target: 'sw' });
check('missing tabId falls back to active tab', state3.res && state3.res.tabId === 7, 'tabId=' + (state3.res && state3.res.tabId));
check('fallback badge still shown', expectBadge ? startedBadge && startedBadge.tabId === 7 : startedBadge === null, startedBadge && 'badge at tab ' + startedBadge.tabId);

const failed = results.filter(r => !r.ok);
console.log('\n===== SUMMARY =====');
console.log('SW file under test : ' + file);
console.log('Expect badge       : ' + (expectBadge ? 'YES (fixed code)' : 'NO (pre-fix code)'));
console.log('Passed             : ' + (results.length - failed.length) + '/' + results.length);
console.log('Result             : ' + (failed.length === 0 ? 'ALL PASS' : 'FAILURES: ' + failed.map(f => f.name).join('; ')));
process.exit(failed.length === 0 ? 0 : 1);
