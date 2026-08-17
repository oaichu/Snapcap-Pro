// SnapCap Offscreen - MediaRecorder engine
//
// Wire-protocol action strings are duplicated per file; keep spellings consistent with §0 of the plan.

const ROLE = 'offscreen';
const ROLE_SW = 'sw';

const ACTION_OFFSCREEN_PING = 'OFFSCREEN_PING';
const ACTION_OFFSCREEN_PONG = 'OFFSCREEN_PONG';
const ACTION_OFFSCREEN_START_RECORDING = 'OFFSCREEN_START_RECORDING';
const ACTION_OFFSCREEN_STOP_RECORDING = 'OFFSCREEN_STOP_RECORDING';
const ACTION_STOP_ACK = 'STOP_ACK';
const ACTION_RECORDING_BUSY = 'RECORDING_BUSY';
const ACTION_RECORDING_COMPLETE = 'RECORDING_COMPLETE';
const ACTION_RECORDING_ERROR = 'RECORDING_ERROR';

const HARD_CAP_GRACE_MS = 10000;
const CHUNK_MS = 500;

let mediaRecorder = null;
let recordedChunks = [];
let recordTimeout = null;
let hardCapTimeout = null;

// Hoisted out of the try block so every teardown path can reach it.
let stream = null;
// Registry of EVERY MediaStream we acquired (desktop + mic). releaseStream()
// is the single place that stops tracks (H-4).
const activeStreams = [];

// NOTE: this document owns NO picker. chrome.desktopCapture is not exposed to
// offscreen documents (only the chrome.runtime messaging surface is), so the
// service worker opens the picker with a `targetTab` and sends us only the
// resulting stream id.

let saveInFlight = null;
let finalized = false;
let recordingArmed = false; // true once mediaRecorder.start() actually ran
let recordingMimeType = 'video/webm';

// True from just before getUserMedia() until mediaRecorder.start() ran (or the
// attempt failed). During that window there is no recorder to stop, but a
// stream may already be live, so the document is NOT idle (N-3).
let startInFlight = false;
// A stop that arrived during that window; honoured as soon as the recorder
// exists instead of being silently dropped (N-2).
let pendingStop = false;

// Latch for the document-teardown path (see handleTeardown below). Declared
// here with the other module-level state because startRecording() resets it
// long before that section of the file is reached (no TDZ window, NEW-2).
let teardownStarted = false;

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------
function sendToSw(payload) {
  const message = { ...payload, target: ROLE_SW };
  try {
    const result = chrome.runtime.sendMessage(message);
    if (result && typeof result.catch === 'function') {
      result.catch(err =>
        console.warn('[SnapCap offscreen] service worker unreachable:', err && err.message)
      );
    }
  } catch (err) {
    console.warn('[SnapCap offscreen] sendMessage failed:', err && err.message);
  }
}

function isRecording() {
  // startInFlight counts as recording: the acquisition window must never be
  // reported as idle, or the service worker can destroy the document (or start
  // a second recording) mid-getUserMedia.
  return !!(startInFlight || (mediaRecorder && mediaRecorder.state !== 'inactive'));
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg.action !== 'string') return;
  if (msg.target !== ROLE) return; // §0 target discipline

  if (msg.action === ACTION_OFFSCREEN_PING) {
    sendResponse({
      action: ACTION_OFFSCREEN_PONG,
      target: ROLE_SW,
      recording: isRecording(),
      saving: !!saveInFlight,
    });
    return;
  }

  if (msg.action === ACTION_OFFSCREEN_START_RECORDING) {
    if (isRecording() || saveInFlight) {
      // Already busy is BUSY, never an error (C-3).
      sendResponse({ action: ACTION_RECORDING_BUSY, target: ROLE_SW });
      sendToSw({ action: ACTION_RECORDING_BUSY, reason: 'already_recording' });
      return;
    }
    sendResponse({ status: 'recording_starting' });
    startRecording(msg.streamId, msg.duration || 30, !!msg.mic, msg.canRequestAudioTrack === true);
    return;
  }

  if (msg.action === ACTION_OFFSCREEN_STOP_RECORDING) {
    // Acknowledge IMMEDIATELY, finalise asynchronously (C-4).
    sendResponse({ action: ACTION_STOP_ACK, target: ROLE_SW });
    sendToSw({ action: ACTION_STOP_ACK });
    stopRecording('sw-request');
    return;
  }
});

// ---------------------------------------------------------------------------
// Stream registry
// ---------------------------------------------------------------------------
function releaseStream() {
  while (activeStreams.length) {
    const s = activeStreams.pop();
    try {
      s.getTracks().forEach(track => {
        try {
          track.onended = null;
          track.stop();
        } catch (err) {
          /* already stopped */
        }
      });
    } catch (err) {
      /* stream already dead */
    }
  }
  stream = null;
}

function clearRecordTimeout() {
  if (recordTimeout) {
    clearTimeout(recordTimeout);
    recordTimeout = null;
  }
}

function clearTimers() {
  clearRecordTimeout();
  if (hardCapTimeout) {
    clearTimeout(hardCapTimeout);
    hardCapTimeout = null;
  }
}

// ---------------------------------------------------------------------------
// mimeType negotiation — AFTER the track composition is known (M-6)
// ---------------------------------------------------------------------------
function pickMimeType(hasAudio) {
  const candidates = hasAudio
    ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];

  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return 'video/webm';
}

// ---------------------------------------------------------------------------
// Recording
// ---------------------------------------------------------------------------
async function startRecording(streamId, duration, includeMic, canRequestAudioTrack) {
  if (isRecording() || saveInFlight) {
    sendToSw({ action: ACTION_RECORDING_BUSY, reason: 'already_recording' });
    return;
  }

  finalized = false;
  recordingArmed = false;
  pendingStop = false;
  // The teardown latch is per-recording, not per-document: a warm document
  // that already saw one teardown must not be permanently disarmed (N-1).
  teardownStarted = false;
  recordedChunks = [];
  clearTimers();
  releaseStream();

  // ONE getUserMedia call. The desktop stream id is one-shot: a second
  // getUserMedia on the same id can never succeed (C-1), so the audio block is
  // only included when the picker actually granted an audio track.
  const constraints = {
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId,
        maxFrameRate: 60,
      },
    },
  };

  if (canRequestAudioTrack === true) {
    constraints.audio = {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId,
      },
    };
  }

  startInFlight = true;

  try {
    if (canRequestAudioTrack === true) {
      const audioConstraints = {
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: streamId,
            maxFrameRate: 60,
          },
        },
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: streamId,
          },
        },
      };
      try {
        stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
      } catch (audioErr) {
        console.warn('[SnapCap offscreen] Audio capture failed, falling back to video-only:', audioErr);
        const videoOnlyConstraints = {
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: streamId,
              maxFrameRate: 60,
            },
          },
        };
        stream = await navigator.mediaDevices.getUserMedia(videoOnlyConstraints);
      }
    } else {
      const videoOnlyConstraints = {
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: streamId,
            maxFrameRate: 60,
          },
        },
      };
      stream = await navigator.mediaDevices.getUserMedia(videoOnlyConstraints);
    }
    activeStreams.push(stream);
  } catch (err) {
    const message = (err && err.message) || String(err);
    startInFlight = false;
    pendingStop = false;
    releaseStream();

    sendToSw({
      action: ACTION_RECORDING_ERROR,
      fatal: true,
      error: 'Screen capture failed: ' + message,
    });
    return;
  }

  if (includeMic) {
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      activeStreams.push(micStream);
      micStream.getAudioTracks().forEach(track => stream.addTrack(track));
    } catch (err) {
      console.warn('Mic access denied:', err);
    }
  }

  const videoTrack = stream.getVideoTracks()[0];
  if (!videoTrack) {
    startInFlight = false;
    pendingStop = false;
    releaseStream();
    sendToSw({
      action: ACTION_RECORDING_ERROR,
      fatal: true,
      error: 'The selected source produced no video track.',
    });
    return;
  }

  // Native "Stop sharing" bar / source disappearing => graceful stop (C-6).
  videoTrack.onended = () => {
    console.warn('[SnapCap offscreen] video track ended (native stop sharing)');
    stopRecording('track-ended');
  };

  recordingMimeType = pickMimeType(stream.getAudioTracks().length > 0);

  try {
    mediaRecorder = new MediaRecorder(stream, { mimeType: recordingMimeType });
  } catch (err) {
    startInFlight = false;
    pendingStop = false;
    releaseStream();
    sendToSw({
      action: ACTION_RECORDING_ERROR,
      fatal: true,
      error: 'MediaRecorder could not start: ' + ((err && err.message) || String(err)),
    });
    return;
  }

  mediaRecorder.ondataavailable = e => {
    if (e.data?.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    finalize();
  };

  mediaRecorder.onerror = e => {
    clearTimers();
    releaseStream();
    finalized = true;
    recordingArmed = false;
    mediaRecorder = null;
    recordedChunks = [];
    sendToSw({
      action: ACTION_RECORDING_ERROR,
      fatal: true,
      error: (e && e.error && e.error.message) || 'Recording failed',
    });
  };

  mediaRecorder.start(CHUNK_MS);
  recordingArmed = true;
  startInFlight = false;

  recordTimeout = setTimeout(() => {
    stopRecording('duration-reached');
  }, duration * 1000);

  // Self-defense: terminate even if the service worker is dead (C-5). Only
  // finalize() disarms it, so it also rescues a stop() whose onstop never came.
  hardCapTimeout = setTimeout(
    () => {
      console.warn('[SnapCap offscreen] hard cap reached; self-terminating');
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        stopRecording('hard-cap');
      } else if (!finalized && !saveInFlight && recordingArmed) {
        finalize(); // save whatever was captured
      }
    },
    duration * 1000 + HARD_CAP_GRACE_MS
  );

  // A stop that arrived while getUserMedia was pending is honoured now that a
  // recorder exists. The timers above are armed first, so the hard cap still
  // rescues a stop() whose onstop never fires (N-2).
  if (pendingStop) {
    pendingStop = false;
    stopRecording('stop-requested-during-start');
    return;
  }
}

function stopRecording(reason) {
  // Stop pressed while getUserMedia is still pending: there is no recorder to
  // stop and no stream to release yet. Remember it instead of dropping it —
  // releasing an empty registry here would leave the real stream sharing.
  if (startInFlight) {
    pendingStop = true;
    return null;
  }

  // Only the duration timer is disarmed here: the hard cap stays armed until
  // finalize() runs, so a stop() whose onstop never fires is still rescued.
  clearRecordTimeout();

  // A save already in flight must never be interrupted.
  if (saveInFlight) return saveInFlight;

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try {
      mediaRecorder.stop(); // onstop -> finalize()
    } catch (err) {
      console.warn('[SnapCap offscreen] stop() threw, finalising directly:', err && err.message);
      return finalize();
    }
    return null;
  }

  if (finalized) return null;

  if (!recordingArmed) {
    // Never started (e.g. the user cancelled the picker, or the service worker
    // is force-closing a warm but idle document). This is not an error and
    // must not raise one: the service worker already owns that narrative.
    releaseStream();
    return null;
  }

  // Armed but nothing to stop and nothing saved: tell the service worker so it
  // can end the session instead of waiting for its watchdog.
  finalized = true;
  releaseStream();
  sendToSw({
    action: ACTION_RECORDING_ERROR,
    fatal: true,
    error: 'Recording stopped before it produced any data (' + (reason || 'unknown') + ').',
  });
  return null;
}

function finalize() {
  if (finalized) return saveInFlight;
  finalized = true;
  clearTimers();

  saveInFlight = (async () => {
    try {
      releaseStream();
      const blob = new Blob(recordedChunks, { type: recordingMimeType });
      if (blob.size === 0) {
        sendToSw({
          action: ACTION_RECORDING_ERROR,
          fatal: true,
          error: 'The recording was empty.',
        });
        return;
      }
      const id = await saveVideo(blob);
      sendToSw({ action: ACTION_RECORDING_COMPLETE, blobSize: blob.size, id });
    } catch (err) {
      sendToSw({
        action: ACTION_RECORDING_ERROR,
        fatal: true,
        error: (err && err.message) || 'Saving the recording failed',
      });
    } finally {
      mediaRecorder = null;
      recordedChunks = [];
      recordingArmed = false;
      saveInFlight = null;
    }
  })();

  return saveInFlight;
}

// ---------------------------------------------------------------------------
// Document teardown. beforeunload is unreliable for offscreen documents, so we
// listen to pagehide AND visibilitychange; both attempt a graceful stop first
// and then release every registered stream.
// `teardownStarted` is declared with the module-level state at the top.
// ---------------------------------------------------------------------------
function handleTeardown(source) {
  if (teardownStarted) return;
  teardownStarted = true;
  console.warn('[SnapCap offscreen] teardown via ' + source);
  try {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  } catch (err) {
    /* best effort */
  }
  releaseStream();
}

window.addEventListener('pagehide', () => handleTeardown('pagehide'));

document.addEventListener('visibilitychange', () => {
  // An offscreen document is never rendered, so this normally only fires while
  // the document is being torn down — but a spurious hidden event at document
  // creation would otherwise burn the latch (disarming the pagehide safety
  // net) or truncate a recording. Only act when a recording is actually live.
  if (document.visibilityState !== 'hidden') return;
  if (!(recordingArmed || mediaRecorder)) return;
  handleTeardown('visibilitychange');
});

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------
async function saveVideo(blob) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SnapCapDB', 1);

    request.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('captures')) {
        db.createObjectStore('captures', { keyPath: 'id' });
      }
    };

    request.onsuccess = e => {
      const db = e.target.result;
      const tx = db.transaction('captures', 'readwrite');
      const store = tx.objectStore('captures');
      const id = 'vid_' + crypto.randomUUID();

      store.put({ id, type: 'video', blob, timestamp: Date.now() });
      tx.oncomplete = () => resolve(id);
      tx.onerror = () => reject(tx.error);
    };

    request.onerror = () => reject(request.error);
  });
}
