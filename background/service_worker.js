// SnapCap Background Service Worker
//
// This file is copied verbatim into dist/ (it is never bundled), so it must
// stay import-free.
// Wire-protocol action strings are duplicated per file; keep spellings consistent with §0 of the plan.

// ---------------------------------------------------------------------------
// Roles + protocol
// ---------------------------------------------------------------------------
const ROLE = 'sw';
const ROLE_OFFSCREEN = 'offscreen';
const ROLE_CONTENT = 'content';
const ROLE_POPUP = 'popup';

const ACTION_OFFSCREEN_PING = 'OFFSCREEN_PING';
const ACTION_OFFSCREEN_PONG = 'OFFSCREEN_PONG';
const ACTION_OFFSCREEN_START_RECORDING = 'OFFSCREEN_START_RECORDING';
const ACTION_OFFSCREEN_STOP_RECORDING = 'OFFSCREEN_STOP_RECORDING';
const ACTION_STOP_ACK = 'STOP_ACK';
const ACTION_RECORDING_BUSY = 'RECORDING_BUSY';
const ACTION_RECORDING_COMPLETE = 'RECORDING_COMPLETE';
const ACTION_RECORDING_ERROR = 'RECORDING_ERROR';
const ACTION_GET_RECORDING_STATE = 'GET_RECORDING_STATE';
const ACTION_STOP_RECORDING_TRIGGER = 'STOP_RECORDING_TRIGGER';

// ---------------------------------------------------------------------------
// Session (single versioned storage key — replaces recordingActive/tabId)
// ---------------------------------------------------------------------------
const SESSION_KEY = 'snapcap.session.v1';
const LEGACY_RECORDING_KEY = 'recordingActive';
const OFFSCREEN_PATH = 'offscreen/offscreen.html';

const STATE_IDLE = 'idle';
const STATE_STARTING = 'starting';
const STATE_RECORDING = 'recording';
const STATE_STOPPING = 'stopping';

const SESSION_GRACE_MS = 15000;
// The picker runs on human time: choosing a screen/window can legitimately take
// minutes. STARTING therefore gets its OWN generous deadline instead of being
// force-terminated by the (much shorter) recording-duration deadline (N-6).
const PICKER_DEADLINE_MS = 5 * 60 * 1000;
const STOP_ACK_TIMEOUT_MS = 10000;
const FINALIZE_TIMEOUT_MS = 15000;
const OFFSCREEN_READY_CEILING_MS = 25000;
const OFFSCREEN_POLL_MS = 150;
const PING_TIMEOUT_MS = 1200;
const KEEPALIVE_MS = 20000;
const MAX_DURATION_S = 30;
const MIN_DURATION_S = 5;

// The picker is owned by the POPUP now (N-11): the service worker cannot open
// chooseDesktopMedia() without a targetTab (which would origin-lock the stream
// to that tab), so the SW merely relays the stream id the popup obtained.
const IDLE_SESSION = Object.freeze({
  state: STATE_IDLE,
  tabId: null,
  startedAt: 0,
  duration: 0,
  mic: false,
  forceVideoOnly: false,
  offscreenUrl: null,
});

async function readSession() {
  try {
    const res = await chrome.storage.local.get(SESSION_KEY);
    const raw = res[SESSION_KEY];
    if (!raw || typeof raw !== 'object' || typeof raw.state !== 'string') {
      return { ...IDLE_SESSION };
    }
    return { ...IDLE_SESSION, ...raw };
  } catch (err) {
    console.warn('[SnapCap] readSession failed:', err);
    return { ...IDLE_SESSION };
  }
}

async function writeSession(patch) {
  const current = await readSession();
  const next = { ...current, ...patch };
  await chrome.storage.local.set({ [SESSION_KEY]: next });
  return next;
}

// Only apply the patch while the session is still in one of `states`.
// Prevents a late write from resurrecting a session that was already torn down.
async function patchSessionIfState(states, patch) {
  const current = await readSession();
  if (!states.includes(current.state)) return null;
  const next = { ...current, ...patch };
  await chrome.storage.local.set({ [SESSION_KEY]: next });
  return next;
}

async function clearSession() {
  await chrome.storage.local.set({ [SESSION_KEY]: { ...IDLE_SESSION } });
}

// Compare-and-set start mutex: the session may only leave 'idle'.
async function acquireStartLock(duration, mic, forceVideoOnly) {
  const current = await readSession();
  if (current.state !== STATE_IDLE) return false;
  await chrome.storage.local.set({
    [SESSION_KEY]: {
      ...IDLE_SESSION,
      state: STATE_STARTING,
      startedAt: Date.now(),
      duration,
      mic: !!mic,
      forceVideoOnly: !!forceVideoOnly,
      offscreenUrl: chrome.runtime.getURL(OFFSCREEN_PATH),
    },
  });
  return true;
}

function sessionDeadline(session) {
  // STARTING is now transient (the popup owns the picker and relays a stream id,
  // so this state lasts only as long as the offscreen relay). PICKER_DEADLINE_MS
  // is a generous safety net for a STARTING session stranded by a crash.
  if (session.state === STATE_STARTING) {
    return (session.startedAt || 0) + PICKER_DEADLINE_MS;
  }
  return (session.startedAt || 0) + (session.duration || 0) * 1000 + SESSION_GRACE_MS;
}

// Runs on EVERY service-worker wake. A session that outlived its own deadline
// cannot be recovered (the SW that owned it is gone) — force-terminate it.
async function reconcileSession(reason) {
  const session = await readSession();
  if (session.state === STATE_IDLE) {
    return session;
  }

  if (!session.startedAt || Date.now() > sessionDeadline(session)) {
    console.warn('[SnapCap] reconcile: stale session (' + reason + ')', session);
    await terminateSession({
      session,
      reason: 'stale-session',
      error: 'Recording was interrupted and has been reset.',
    });
    return await readSession();
  }

  return session;
}

// ---------------------------------------------------------------------------
// Service-worker keepalive (the desktop picker runs on human time)
// ---------------------------------------------------------------------------
let keepAliveTimer = null;

function startKeepAlive() {
  if (keepAliveTimer) return;
  keepAliveTimer = setInterval(() => {
    chrome.runtime.getPlatformInfo().catch(() => {});
  }, KEEPALIVE_MS);
}

function stopKeepAlive() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

// ---------------------------------------------------------------------------
// Offscreen document lifecycle — ONE create/close mutex
// ---------------------------------------------------------------------------
let offscreenOpMutex = null;

function supportsGetContexts() {
  return typeof chrome.runtime.getContexts === 'function';
}

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error((label || 'operation') + ' timed out after ' + ms + 'ms'));
    }, ms);
    Promise.resolve(promise).then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      err => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function offscreenDocumentExists() {
  if (supportsGetContexts()) {
    try {
      const contexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL(OFFSCREEN_PATH)],
      });
      return Array.isArray(contexts) && contexts.length > 0;
    } catch (err) {
      console.warn('[SnapCap] getContexts failed:', err);
      return await pingOffscreen();
    }
  }
  // Degraded path (no chrome.runtime.getContexts): probe with a ping.
  return await pingOffscreen();
}

async function pingOffscreenStatus() {
  try {
    const res = await withTimeout(
      chrome.runtime.sendMessage({ action: ACTION_OFFSCREEN_PING, target: ROLE_OFFSCREEN }),
      PING_TIMEOUT_MS,
      ACTION_OFFSCREEN_PING
    );
    return res && res.action === ACTION_OFFSCREEN_PONG ? res : null;
  } catch (err) {
    return null;
  }
}

async function pingOffscreen() {
  return (await pingOffscreenStatus()) !== null;
}

// Wait until the offscreen document is neither recording nor writing a blob,
// so a force-close can never interrupt a save in flight.
async function waitForOffscreenIdle(ceilingMs) {
  const deadline = Date.now() + ceilingMs;
  while (Date.now() < deadline) {
    const pong = await pingOffscreenStatus();
    if (!pong) return true; // gone or unreachable: nothing left to protect
    if (!pong.recording && !pong.saving) return true;
    await sleep(OFFSCREEN_POLL_MS);
  }
  console.warn('[SnapCap] offscreen still busy after ' + ceilingMs + 'ms; closing anyway');
  return false;
}

// Readiness = the document exists AND its message listener answers a ping.
async function waitForOffscreenReady(ceilingMs) {
  const deadline = Date.now() + ceilingMs;
  while (Date.now() < deadline) {
    const exists = supportsGetContexts() ? await offscreenDocumentExists() : true;
    if (exists && (await pingOffscreen())) return true;
    await sleep(OFFSCREEN_POLL_MS);
  }
  return false;
}

async function createOffscreenDocument() {
  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_PATH,
      reasons: ['USER_MEDIA', 'DISPLAY_MEDIA'],
      justification: 'Record screen and audio for short clips',
    });
  } catch (err) {
    const message = (err && err.message) || String(err);
    // Another wake already created it — that is not an error for us.
    if (!/single offscreen document/i.test(message)) throw err;
  }
}

async function ensureOffscreenUnlocked() {
  const exists = await offscreenDocumentExists();

  if (exists) {
    // A pre-existing document still has to prove it is READY (the old
    // early-return shipped an unusable document to the caller).
    if (await waitForOffscreenReady(OFFSCREEN_READY_CEILING_MS)) return true;

    console.warn('[SnapCap] offscreen document exists but never answered a ping; recreating once');
    await closeOffscreenUnlocked();
    await createOffscreenDocument();
    if (await waitForOffscreenReady(OFFSCREEN_READY_CEILING_MS)) return true;

    throw new Error('Offscreen document is unresponsive. Reload the extension and try again.');
  }

  await createOffscreenDocument();
  if (await waitForOffscreenReady(OFFSCREEN_READY_CEILING_MS)) return true;

  // Never resolve on timeout — the caller must not believe it is ready.
  throw new Error(
    'Offscreen document did not become ready within ' + OFFSCREEN_READY_CEILING_MS + 'ms.'
  );
}

async function closeOffscreenUnlocked() {
  if (!(await offscreenDocumentExists())) return true; // idempotent

  try {
    await chrome.offscreen.closeDocument();
  } catch (err) {
    console.warn('[SnapCap] closeDocument failed, retrying once:', err);
    try {
      await chrome.offscreen.closeDocument();
    } catch (err2) {
      console.warn('[SnapCap] closeDocument retry failed:', err2);
    }
  }

  if (await offscreenDocumentExists()) {
    const message =
      'SnapCap could not close its recording document. Reload the extension from chrome://extensions.';
    console.error('[SnapCap] FATAL: ' + message);
    sendToPopup({
      action: ACTION_RECORDING_ERROR,
      target: ROLE_POPUP,
      fatal: true,
      error: message,
    });
    throw new Error(message);
  }

  return true;
}

function runOffscreenOp(fn) {
  const previous = offscreenOpMutex;
  const op = (async () => {
    if (previous) {
      try {
        await previous;
      } catch (err) {
        /* previous op failed; continue */
      }
    }
    return await fn();
  })();
  offscreenOpMutex = op.catch(() => {});
  return op;
}

function ensureOffscreen() {
  return runOffscreenOp(ensureOffscreenUnlocked);
}

function closeOffscreen() {
  return runOffscreenOp(closeOffscreenUnlocked);
}

// ---------------------------------------------------------------------------
// Badge helpers (always addressed at the SESSION tab, never "the active tab")
// ---------------------------------------------------------------------------
async function showBadge(tabId, duration, startedAt) {
  if (!tabId) return;
  try {
    await chrome.tabs.sendMessage(tabId, {
      action: 'SHOW_RECORD_BADGE',
      target: ROLE_CONTENT,
      duration,
      startedAt,
    });
  } catch (err) {
    // Best effort only: the popup Stop button is the primary control (L-2).
    console.warn('[SnapCap] badge not shown (content script unavailable):', err && err.message);
  }
}

async function hideBadge(tabId) {
  if (!tabId) return;
  try {
    await chrome.tabs.sendMessage(tabId, { action: 'HIDE_RECORD_BADGE', target: ROLE_CONTENT });
  } catch (err) {
    console.warn('[SnapCap] badge not hidden (content script unavailable):', err && err.message);
  }
}

// ---------------------------------------------------------------------------
// Terminal protocol / watchdog
// ---------------------------------------------------------------------------
let stopWatchdog = null;

function armStopWatchdog(ms, phase) {
  clearStopWatchdog();
  stopWatchdog = setTimeout(() => {
    stopWatchdog = null;
    console.warn('[SnapCap] stop watchdog expired during ' + phase);
    readSession()
      .then(session =>
        terminateSession({
          session,
          reason: 'stop-watchdog',
          error: 'Recording did not finish in time and was force-stopped.',
          notifyPopup: true,
        })
      )
      .catch(err => console.error('[SnapCap] watchdog termination failed:', err));
  }, ms);
}

function clearStopWatchdog() {
  if (stopWatchdog) {
    clearTimeout(stopWatchdog);
    stopWatchdog = null;
  }
}

// Best-effort graceful stop before we are allowed to close the document.
async function attemptGracefulStop() {
  try {
    await withTimeout(
      chrome.runtime.sendMessage({
        action: ACTION_OFFSCREEN_STOP_RECORDING,
        target: ROLE_OFFSCREEN,
      }),
      STOP_ACK_TIMEOUT_MS,
      ACTION_OFFSCREEN_STOP_RECORDING
    );
  } catch (err) {
    /* offscreen already gone or unresponsive */
  }
}

// The single teardown chokepoint: every terminal path funnels through here.
// closeOffscreen() is ALWAYS preceded by a graceful stop attempt plus a bounded
// wait for any save already in flight.
async function terminateSession(opts) {
  const options = opts || {};
  const session = options.session || (await readSession());

  clearStopWatchdog();

  if (options.graceful !== false) {
    await attemptGracefulStop();
    await waitForOffscreenIdle(FINALIZE_TIMEOUT_MS);
  }

  await clearSession();
  await hideBadge(session.tabId);

  try {
    await closeOffscreen();
  } catch (err) {
    console.error('[SnapCap] offscreen teardown failed:', err && err.message);
  }

  stopKeepAlive();

  if (options.notifyPopup !== false) {
    if (options.cancelled) {
      sendToPopup({ action: 'RECORDING_CANCELLED', target: ROLE_POPUP });
    } else if (options.error) {
      sendToPopup({
        action: ACTION_RECORDING_ERROR,
        target: ROLE_POPUP,
        fatal: true,
        error: options.error,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Message handler — synchronous listener, asynchronous dispatch.
// `return true` ONLY on branches that answer asynchronously.
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg.action !== 'string') return;
  if (msg.target && msg.target !== ROLE) return; // §0 target discipline

  switch (msg.action) {
    case 'CAPTURE_VISIBLE':
      captureVisible(sendResponse);
      return true;

    case 'CAPTURE_TAB_PROMISE':
      captureVisibleTabOnce().then(sendResponse);
      return true;

    case 'CAPTURE_SELECTED':
      // Fire-and-forget: the caller (popup) closes as soon as the user drags.
      // No response is promised, so the channel is not held open (M-5).
      triggerSelection().catch(err => console.warn('[SnapCap] CAPTURE_SELECTED:', err));
      return;

    case 'CROP_VISIBLE_TAB':
      captureCropped(msg.crop, sendResponse);
      return true;

    case 'CAPTURE_FULL_PAGE':
      captureFullPage(sendResponse);
      return true;

    case 'START_RECORDING':
      startRecording(msg.duration, msg.mic, msg.streamId, msg.canRequestAudioTrack).catch(err =>
        console.error('[SnapCap] startRecording failed:', err)
      );
      return;

    case ACTION_STOP_RECORDING_TRIGGER:
      stopRecording({ source: msg.source || 'unknown' }).catch(err =>
        console.error('[SnapCap] stopRecording failed:', err)
      );
      return;

    case ACTION_GET_RECORDING_STATE:
      readSession()
        .then(session => sendResponse(publicSessionView(session)))
        .catch(() => sendResponse(publicSessionView(null)));
      return true;

    case ACTION_STOP_ACK:
      handleStopAck();
      return;

    case ACTION_RECORDING_BUSY:
      // Informational only — never a failure (C-3).
      sendToPopup({
        action: ACTION_RECORDING_BUSY,
        target: ROLE_POPUP,
        info: msg.reason || 'A recording is already in progress.',
      });
      return;

    case ACTION_RECORDING_COMPLETE:
      handleRecordingComplete(msg).catch(err =>
        console.error('[SnapCap] handleRecordingComplete failed:', err)
      );
      return;

    case ACTION_RECORDING_ERROR:
      handleRecordingError(msg).catch(err =>
        console.error('[SnapCap] handleRecordingError failed:', err)
      );
      return;

    case 'CAPTURE_RESULT_IN_PAGE':
      // handled in content script; ignore here
      return;

    case 'OPEN_EDITOR':
      openEditor(msg.mode || 'image', msg.id || '');
      return;

    case 'DOWNLOAD_IMAGE':
      chrome.downloads.download({
        url: msg.dataUrl,
        filename: msg.filename || `snapcap-${Date.now()}.png`,
        saveAs: false,
      });
      sendResponse({ ok: true });
      return;
  }
});

function publicSessionView(session) {
  const s = session || { ...IDLE_SESSION };
  const totalMs = (s.duration || 0) * 1000;
  const elapsedMs = s.startedAt ? Date.now() - s.startedAt : 0;
  return {
    state: s.state || STATE_IDLE,
    tabId: s.tabId || null,
    duration: s.duration || 0,
    startedAt: s.startedAt || 0,
    remaining:
      s.state === STATE_RECORDING ? Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000)) : 0,
  };
}

async function triggerSelection() {
  const tabId = await getActiveTabId();
  if (!tabId) return;
  try {
    await chrome.tabs.sendMessage(tabId, { action: 'TRIGGER_SELECTION', target: ROLE_CONTENT });
  } catch (err) {
    console.warn('Content script not ready:', err && err.message);
  }
}

// Send a message to an open popup (if any). No-op when closed.
function sendToPopup(msg) {
  isPopupOpen().then(open => {
    if (open) {
      chrome.runtime.sendMessage({ target: ROLE_POPUP, ...msg }).catch(() => {});
    }
  });
}

function isPopupOpen() {
  if (!supportsGetContexts()) return Promise.resolve(true);
  return chrome.runtime
    .getContexts({ contextTypes: ['POPUP'] })
    .then(contexts => contexts.length > 0)
    .catch(() => false);
}

async function getActiveTabId() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs && tabs[0] ? tabs[0].id : null;
  } catch (err) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Screenshot capture
// ---------------------------------------------------------------------------
function describeCaptureError(err) {
  const raw = (err && err.message) || '';
  if (/Exceeded maximum/i.test(raw)) {
    return 'Chrome is rate-limiting screenshots. Wait a second and try again.';
  }
  if (/activeTab|permission|Cannot access|not in effect/i.test(raw)) {
    return 'SnapCap has no permission for this tab. Open the SnapCap popup on the page you want to capture and start the capture from there. chrome:// pages and the Chrome Web Store can never be captured.';
  }
  return raw || 'Capture failed. Make sure the active tab is a normal website (not chrome://).';
}

function captureVisibleTabOnce() {
  return new Promise(resolve => {
    try {
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, dataUrl => {
        const err = chrome.runtime.lastError;
        if (err || !dataUrl) {
          resolve({ dataUrl: null, error: describeCaptureError(err) });
          return;
        }
        resolve({ dataUrl });
      });
    } catch (err) {
      resolve({ dataUrl: null, error: describeCaptureError(err) });
    }
  });
}

// Capture visible area -> respond directly to the requester (popup)
function captureVisible(sendResponse) {
  captureVisibleTabOnce().then(res => {
    if (!res.dataUrl) {
      sendResponse({ error: res.error });
      return;
    }
    saveToIndexedDB(res.dataUrl, 'image', id => {
      if (!id) {
        sendResponse({ error: 'save_failed' });
        return;
      }
      sendResponse({ dataUrl: res.dataUrl, id });
    });
  });
}

// Capture cropped area -> respond directly to the content script
function captureCropped(crop, sendResponse) {
  captureVisibleTabOnce().then(res => {
    if (!res.dataUrl) {
      sendResponse({ error: res.error });
      return;
    }

    fetch(res.dataUrl)
      .then(r => r.blob())
      .then(createImageBitmap)
      .then(img => {
        const canvas = new OffscreenCanvas(crop.width, crop.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
        img.close();
        return canvas.convertToBlob({ type: 'image/png' });
      })
      .then(blob => {
        return new Promise(resolve => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      })
      .then(croppedUrl => {
        saveToIndexedDB(croppedUrl, 'image', id => {
          if (!id) {
            sendResponse({ error: 'save_failed' });
            return;
          }
          sendResponse({ dataUrl: croppedUrl, id });
        });
      })
      .catch(err => {
        console.error('Crop failed:', err);
        sendResponse({ error: err.message });
      });
  });
}

// Full page capture -> respond directly to the popup
function captureFullPage(sendResponse) {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]) {
      sendResponse({ error: 'No active tab' });
      return;
    }

    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: 'EXECUTE_FULL_PAGE_SCROLL', target: ROLE_CONTENT },
      res => {
        if (chrome.runtime.lastError || !res) {
          console.warn('Content script error:', chrome.runtime.lastError);
          sendResponse({ error: 'Page not ready. Refresh the tab and try again.' });
          return;
        }

        if (res.status === 'success' && res.tiles?.length > 0) {
          stitchTiles(res.tiles).then(stitchedUrl => {
            if (!stitchedUrl) {
              sendResponse({ error: 'Stitching failed' });
              return;
            }
            saveToIndexedDB(stitchedUrl, 'image', id => {
              if (!id) {
                sendResponse({ error: 'save_failed' });
                return;
              }
              sendResponse({ dataUrl: stitchedUrl, id });
            });
          });
        } else {
          sendResponse({ error: res.error || 'Could not scroll the page' });
        }
      }
    );
  });
}

// Stitch tiles together
async function stitchTiles(tiles) {
  if (tiles.length === 1) {
    return tiles[0].dataUrl;
  }

  try {
    const firstBitmap = await fetch(tiles[0].dataUrl)
      .then(r => r.blob())
      .then(createImageBitmap);
    const dpr = tiles[0].devicePixelRatio || 1;
    const totalHeight = Math.round(tiles[0].totalHeight * dpr);
    const width = firstBitmap.width;
    firstBitmap.close();

    const canvas = new OffscreenCanvas(width, totalHeight);
    const ctx = canvas.getContext('2d');

    for (const tile of tiles) {
      const bitmap = await fetch(tile.dataUrl)
        .then(r => r.blob())
        .then(createImageBitmap);
      const drawY = Math.round(tile.y * dpr);
      ctx.drawImage(bitmap, 0, drawY);
      bitmap.close();
    }

    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return await new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('Stitch failed:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Screen recording — start flow
// ---------------------------------------------------------------------------
function normalizeDuration(duration) {
  let value = parseInt(duration, 10);
  if (isNaN(value)) value = MAX_DURATION_S;
  if (value < MIN_DURATION_S) value = MIN_DURATION_S;
  if (value > MAX_DURATION_S) value = MAX_DURATION_S;
  return value;
}

// The popup opens chooseDesktopMedia() (N-11) and relays the resulting stream id
// here. The service worker no longer opens the picker: called from a worker
// context Chromium requires a targetTab, and with targetTab the stream is
// origin-locked to that tab so the offscreen document could never consume it.
// From the popup (extension origin) the stream is bound to the extension, which
// is exactly what the offscreen document's getUserMedia needs.
async function startRecording(duration, mic, streamId, canRequestAudioTrack) {
  const safeDuration = normalizeDuration(duration);

  // Defensive guard: START_RECORDING must always carry the popup's stream id.
  if (!streamId) {
    await failStart('No screen source was selected. Please try again.');
    return;
  }

  await reconcileSession('start-recording');

  if (!(await acquireStartLock(safeDuration, mic, false))) {
    const current = await readSession();
    sendToPopup({
      action: ACTION_RECORDING_BUSY,
      target: ROLE_POPUP,
      state: current.state,
      info: 'A recording is already in progress.',
    });
    return;
  }

  startKeepAlive();

  // The offscreen document receives the stream id, so it has to EXIST and be
  // READY before we relay the start (H-3).
  try {
    await ensureOffscreen();
  } catch (err) {
    await failStart('Could not start the recorder: ' + ((err && err.message) || String(err)));
    return;
  }

  // Stop may have won the race while the document was warming up.
  const warmed = await readSession();
  if (warmed.state !== STATE_STARTING) return;

  const startedAt = Date.now();
  const updated = await patchSessionIfState([STATE_STARTING], {
    state: STATE_RECORDING,
    startedAt,
  });
  if (!updated) return; // torn down in the meantime

  let res;
  try {
    res = await chrome.runtime.sendMessage({
      action: ACTION_OFFSCREEN_START_RECORDING,
      target: ROLE_OFFSCREEN,
      streamId,
      duration: safeDuration,
      mic: !!mic,
      canRequestAudioTrack: !!canRequestAudioTrack,
    });
  } catch (err) {
    await failStart('Could not reach the recorder: ' + ((err && err.message) || String(err)));
    return;
  }

  // N-B: the recorder refused the start because it is still busy. The session
  // was optimistically promoted to RECORDING above, so roll it back instead of
  // leaving a phantom recording nothing will ever finish.
  if (res && res.action === ACTION_RECORDING_BUSY) {
    await failStart(
      'The recorder was still busy with the previous clip, so this recording did not start. Try again in a moment.'
    );
    return;
  }

  await showBadge(warmed.tabId, safeDuration, startedAt);
}

async function failStart(message) {
  const session = await readSession();
  await terminateSession({
    session,
    reason: 'start-failed',
    error: message || 'Recording failed to start.',
  });
}

// ---------------------------------------------------------------------------
// Screen recording — stop / terminal protocol
// STOP is NOT terminal. Only RECORDING_COMPLETE, a fatal RECORDING_ERROR or
// the watchdog may close the offscreen document.
// ---------------------------------------------------------------------------
async function stopRecording(opts) {
  const options = opts || {};
  const session = await readSession();
  console.warn(
    '[SnapCap] stop requested by ' + (options.source || 'unknown') + ' in state ' + session.state
  );

  if (session.state === STATE_IDLE) {
    // Idempotent + force-closing: clean up any orphaned document even when no
    // recorder is known to exist. An orphan that is still saving is given the
    // chance to finish first.
    await hideBadge(session.tabId);
    await attemptGracefulStop();
    await waitForOffscreenIdle(FINALIZE_TIMEOUT_MS);
    try {
      await closeOffscreen();
    } catch (err) {
      console.error('[SnapCap] force close failed:', err && err.message);
    }
    stopKeepAlive();
    return;
  }

  if (session.state === STATE_STOPPING) {
    return; // already stopping — idempotent
  }

  if (session.state === STATE_STARTING) {
    // The stream id never reached the recorder: nothing can be finalised, so
    // terminate straight away.
    await terminateSession({
      session,
      reason: 'stopped-while-starting',
      cancelled: true,
      graceful: true,
    });
    return;
  }

  await writeSession({ state: STATE_STOPPING });
  startKeepAlive();
  armStopWatchdog(STOP_ACK_TIMEOUT_MS, 'stop-ack');

  let acked = false;
  try {
    const res = await chrome.runtime.sendMessage({
      action: ACTION_OFFSCREEN_STOP_RECORDING,
      target: ROLE_OFFSCREEN,
    });
    acked = !!(res && res.action === ACTION_STOP_ACK);
  } catch (err) {
    console.warn('[SnapCap] offscreen unreachable on stop:', err && err.message);
    await terminateSession({
      session: await readSession(),
      reason: 'offscreen-unreachable',
      error: 'The recorder is no longer running. Nothing was saved.',
    });
    return;
  }

  if (acked) handleStopAck();
}

// STOP_ACK ends the ack phase and starts the (bounded) finalise phase.
function handleStopAck() {
  if (!stopWatchdog) return;
  armStopWatchdog(FINALIZE_TIMEOUT_MS, 'finalize');
}

async function handleRecordingComplete(msg) {
  clearStopWatchdog();
  const session = await readSession();

  await clearSession();
  await hideBadge(session.tabId);

  try {
    await closeOffscreen();
  } catch (err) {
    console.error('[SnapCap] offscreen teardown failed after completion:', err && err.message);
  }
  stopKeepAlive();

  deliverRecording(msg.id);
}

async function handleRecordingError(msg) {
  const fatal = msg.fatal !== false;

  if (!fatal && msg.retry === 'video_only') {
    // The video-only retry used to re-open the picker without the system-audio
    // source. The picker is now owned by the popup (N-11), so the service worker
    // can no longer re-open it — surface the capture failure to the user instead.
    console.warn('[SnapCap] video-only retry no longer supported (popup owns picker):', msg.error);
    await terminateSession({
      reason: 'video-capture-refused',
      error:
        msg.error || 'Screen capture with system audio was refused. Recording aborted. Try again.',
    });
    return;
  }

  if (!fatal) {
    // Non-fatal and no retry directive: surface as info, keep the session.
    sendToPopup({
      action: ACTION_RECORDING_BUSY,
      target: ROLE_POPUP,
      info: msg.error || 'Recorder warning',
    });
    return;
  }

  await terminateSession({
    reason: 'recording-error',
    error: msg.error || 'Recording failed',
  });
}

function deliverRecording(id) {
  if (!id) return;
  // The video blob lives in IndexedDB. If the popup is open, tell it to load
  // the capture by id; otherwise open the editor for it.
  isPopupOpen().then(open => {
    if (open) {
      chrome.runtime
        .sendMessage({ action: 'CAPTURE_VIDEO_RESULT', target: ROLE_POPUP, id })
        .catch(() => openEditor('video', id));
    } else {
      openEditor('video', id);
    }
  });
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------
// The callback ALWAYS fires exactly once: with the new id on success, with null
// on any failure. A capture that cannot be saved must surface as an error, not
// as a request that hangs forever behind an unhandled IndexedDB event.
function saveToIndexedDB(dataUrl, type, callback) {
  let settled = false;
  const settle = (id, reason) => {
    if (settled) return;
    settled = true;
    if (!id) console.error('[SnapCap] saveToIndexedDB failed: ' + reason);
    callback(id);
  };

  let request;
  try {
    request = indexedDB.open('SnapCapDB', 1);
  } catch (err) {
    settle(null, 'open threw: ' + ((err && err.message) || String(err)));
    return;
  }

  request.onerror = () => settle(null, 'open error: ' + describeDbError(request.error));
  request.onblocked = () => settle(null, 'open blocked by another connection');

  request.onupgradeneeded = e => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains('captures')) {
      db.createObjectStore('captures', { keyPath: 'id' });
    }
  };

  request.onsuccess = e => {
    const db = e.target.result;
    try {
      const tx = db.transaction('captures', 'readwrite');
      const store = tx.objectStore('captures');
      const id = type + '_' + crypto.randomUUID();

      store.put({
        id,
        type,
        dataUrl,
        timestamp: Date.now(),
      });

      tx.oncomplete = () => settle(id);
      tx.onerror = () => settle(null, 'transaction error: ' + describeDbError(tx.error));
      tx.onabort = () => settle(null, 'transaction aborted: ' + describeDbError(tx.error));
    } catch (err) {
      settle(null, 'transaction threw: ' + ((err && err.message) || String(err)));
    }
  };
}

function describeDbError(err) {
  return (err && (err.message || err.name)) || 'unknown';
}

// Open editor
function openEditor(mode, id = '') {
  const baseUrl = chrome.runtime.getURL('editor/editor.html');
  const url = id ? `${baseUrl}?mode=${mode}&id=${id}` : `${baseUrl}?mode=${mode}`;
  chrome.tabs.create({ url });
}

// ---------------------------------------------------------------------------
// Wake hooks — reconcile on EVERY service-worker start
// ---------------------------------------------------------------------------
chrome.runtime.onStartup.addListener(() => {
  reconcileSession('onStartup').catch(err => console.error('[SnapCap] reconcile failed:', err));
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.remove(LEGACY_RECORDING_KEY).catch(() => {}); // migration
  reconcileSession('onInstalled').catch(err => console.error('[SnapCap] reconcile failed:', err));
});

// Top-level: runs on every wake of this service worker.
reconcileSession('sw-wake').catch(err => console.error('[SnapCap] reconcile failed:', err));
