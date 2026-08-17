// Wire-protocol action strings are duplicated per file; keep spellings consistent with §0 of the plan.
const ROLE = 'popup';
const ROLE_SW = 'sw';
const ACTION_GET_RECORDING_STATE = 'GET_RECORDING_STATE';
const ACTION_STOP_RECORDING_TRIGGER = 'STOP_RECORDING_TRIGGER';
const ACTION_RECORDING_BUSY = 'RECORDING_BUSY';
const ACTION_RECORDING_ERROR = 'RECORDING_ERROR';

// Machine-readable error codes the service worker may answer a capture with.
const ERROR_MESSAGES = {
  save_failed: 'The capture could not be saved to local storage. Please try again.',
};

const STATE_IDLE = 'idle';
const STATE_STARTING = 'starting';
const STATE_RECORDING = 'recording';
const STATE_STOPPING = 'stopping';

document.addEventListener('DOMContentLoaded', () => {
  // Views
  const mainView = document.getElementById('mainView');
  const previewView = document.getElementById('previewView');
  const videoPreviewView = document.getElementById('videoPreviewView');

  // Main view elements
  const btnCaptureVisible = document.getElementById('btnCaptureVisible');
  const btnCaptureSelected = document.getElementById('btnCaptureSelected');
  const btnCaptureFull = document.getElementById('btnCaptureFull');
  const btnStartRecord = document.getElementById('btnStartRecord');
  const btnStopRecord = document.getElementById('btnStopRecord');
  const btnOpenEditor = document.getElementById('openEditorHome');
  const btnViewHistory = document.getElementById('viewHistoryBtn');
  const toggleMic = document.getElementById('toggleMic');
  const delaySelect = document.getElementById('delaySelect');
  const captureStatus = document.getElementById('captureStatus');

  // Preview view elements
  const previewImage = document.getElementById('previewImage');
  const previewVideo = document.getElementById('previewVideo');
  const quickDownload = document.getElementById('quickDownload');
  const quickCopy = document.getElementById('quickCopy');
  const quickShare = document.getElementById('quickShare');
  const quickDownloadVideo = document.getElementById('quickDownloadVideo');
  const quickShareVideo = document.getElementById('quickShareVideo');
  const backBtn = document.getElementById('backBtn');
  const backBtnVideo = document.getElementById('backBtnVideo');
  const editBtn = document.getElementById('editBtn');
  const editBtnVideo = document.getElementById('editBtnVideo');
  const statusBar = document.getElementById('statusBar');
  const statusBarVideo = document.getElementById('statusBarVideo');

  // Captured data
  let capturedImageDataUrl = null;
  let capturedImageId = null;
  let capturedVideoBlob = null;
  let capturedVideoId = null;
  // Exactly one countdown ticker and one state poll exist at any time. The
  // countdown is NEVER torn down by the poll (that re-sync caused the visible
  // 1s jitter, N-7); it only re-derives its end time from the session.
  let recordInterval = null;
  let statePoll = null;
  let countdownEndsAt = 0;
  let currentRecordingState = STATE_IDLE;

  // Load preferences
  chrome.storage.local.get(['micEnabled', 'recordDuration', 'captureDelay'], res => {
    if (res.micEnabled !== undefined) toggleMic.checked = res.micEnabled;
    if (res.recordDuration) setRecordDuration(res.recordDuration);
    if (res.captureDelay) delaySelect.value = res.captureDelay;
  });

  // The service worker owns the session state; ask it, never guess.
  refreshRecordingState();

  // Save preferences
  toggleMic.addEventListener('change', () => {
    chrome.storage.local.set({ micEnabled: toggleMic.checked });
  });

  // Recording duration — iOS-style segmented control
  function getRecordDuration() {
    const active = document.querySelector('#recordSegmented .segmented-item.active');
    return active ? parseInt(active.dataset.duration, 10) : 30;
  }

  function setRecordDuration(seconds) {
    document.querySelectorAll('#recordSegmented .segmented-item').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.duration, 10) === seconds);
    });
  }

  document.querySelectorAll('#recordSegmented .segmented-item').forEach(btn => {
    btn.addEventListener('click', () => {
      setRecordDuration(parseInt(btn.dataset.duration, 10));
      chrome.storage.local.set({ recordDuration: parseInt(btn.dataset.duration, 10) });
    });
  });

  delaySelect.addEventListener('change', () => {
    chrome.storage.local.set({ captureDelay: parseInt(delaySelect.value, 10) });
  });

  // Push messages from the background (only used for the async flows:
  // video result + recording errors/cancels).
  chrome.runtime.onMessage.addListener(msg => {
    if (!msg || typeof msg.action !== 'string') return;
    if (msg.target && msg.target !== ROLE) return; // §0 target discipline

    if (msg.action === 'CAPTURE_VIDEO_RESULT' && msg.id) {
      renderRecordingState({ state: STATE_IDLE });
      loadVideoCaptureById(msg.id).then(blob => {
        if (blob) {
          capturedVideoBlob = blob;
          capturedVideoId = msg.id;
          previewVideo.src = URL.createObjectURL(blob);
          showPreview('video');
          setStatus(statusBarVideo, 'Recorded! Download or share.', 'success');
        }
      });
    }

    if (msg.action === ACTION_RECORDING_ERROR) {
      renderRecordingState({ state: STATE_IDLE });
      showToast('Recording failed: ' + (msg.error || 'unknown error'));
    }

    if (msg.action === 'RECORDING_CANCELLED') {
      renderRecordingState({ state: STATE_IDLE });
      showToast('Recording cancelled');
    }

    // Informational only — a busy recorder is never a failure.
    if (msg.action === ACTION_RECORDING_BUSY) {
      showToast(msg.info || 'A recording is already in progress.');
      refreshRecordingState();
    }
  });

  // Capture functions
  const triggerCapture = actionType => {
    const delay = parseInt(delaySelect.value, 10);

    const execute = () => {
      showMainStatus('Capturing...');
      chrome.runtime.sendMessage({ action: actionType }, res => {
        if (res && res.dataUrl) {
          capturedImageDataUrl = res.dataUrl;
          capturedImageId = res.id;
          previewImage.src = res.dataUrl;
          hideMainStatus();
          showPreview('image');
          setStatus(statusBar, 'Captured! Download, copy, or share.', 'success');
        } else if (res && res.error) {
          const message = ERROR_MESSAGES[res.error] || res.error;
          showMainStatus(message, 'error');
          showToast(message);
        } else {
          // No response at all (service worker died, channel closed, or the
          // handler returned nothing). Never leave "Capturing..." on screen.
          const message =
            (chrome.runtime.lastError && chrome.runtime.lastError.message) ||
            'The capture did not complete. Please try again.';
          showMainStatus(message, 'error');
          showToast(message);
        }
      });
    };

    if (actionType === 'CAPTURE_SELECTED') {
      // The content script puts a selection overlay on the page. The popup will
      // close the moment the user clicks/drags on the page; the result is shown
      // in-page afterwards.
      showMainStatus('Drag to select an area on the page.');
      // Fire-and-forget: the service worker answers nothing, so the promise
      // must be caught or it surfaces as an unhandled rejection.
      chrome.runtime.sendMessage({ action: 'CAPTURE_SELECTED' }).catch(() => {});
      return;
    }

    if (delay > 0) {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (!tabs[0]) return;
        // Content script runs the countdown and replies when done
        chrome.tabs.sendMessage(tabs[0].id, { action: 'START_COUNTDOWN', delay }, () => {
          execute();
        });
      });
    } else {
      // Reset preview then capture
      execute();
    }
  };

  // Screenshot buttons
  btnCaptureVisible.addEventListener('click', () => triggerCapture('CAPTURE_VISIBLE'));
  btnCaptureSelected.addEventListener('click', () => triggerCapture('CAPTURE_SELECTED'));
  btnCaptureFull.addEventListener('click', () => triggerCapture('CAPTURE_FULL_PAGE'));

  // Recording
  btnStartRecord.addEventListener('click', () => {
    let duration = getRecordDuration();
    if (isNaN(duration) || duration < 10) duration = 30;
    if (duration > 30) duration = 30;

    // The popup (a chrome-extension:// RenderFrameHost) OWNS the native picker.
    // chooseDesktopMedia() called from the service worker hard-errors without a
    // targetTab, and WITH a targetTab the stream is origin-locked to that tab so
    // the offscreen document could never consume it. Called here WITHOUT a
    // targetTab the stream is bound to the extension origin, so the offscreen
    // document's getUserMedia({ chromeMediaSourceId: streamId }) succeeds (N-11).
    renderRecordingState({ state: STATE_STARTING, duration });
    btnStartRecord.innerHTML = 'Selecting source...';

    // The tab on screen while recording is the tab behind the popup; the service
    // worker needs its id to show the in-page recording badge at the right tab.
    // Resolve it in PARALLEL with the picker: the query is near-instant, while
    // choosing a source takes seconds, so by the time the picker callback fires
    // the value is virtually always available. START_RECORDING is sent directly
    // in the picker callback (no promise chain) so a popup close can never drop
    // the message; if the id is still missing, the service worker falls back to
    // the active tab (best effort).
    let activeTabId = null;
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      activeTabId = tabs && tabs[0] ? tabs[0].id : null;
    });

    chrome.desktopCapture.chooseDesktopMedia(
      ['screen', 'window', 'tab', 'audio'],
      (streamId, pickerOptions) => {
        if (!streamId) {
          // The user dismissed the picker without choosing a source.
          renderRecordingState({ state: STATE_IDLE });
          showToast('Recording cancelled');
          return;
        }

        const canRequestAudioTrack = !!(pickerOptions && pickerOptions.canRequestAudioTrack);
        // Fire-and-forget: START_RECORDING is answered by push messages, not by a
        // response, so the promise must be caught (unhandled rejection otherwise).
        chrome.runtime
          .sendMessage({
            action: 'START_RECORDING',
            target: ROLE_SW,
            streamId,
            canRequestAudioTrack,
            duration,
            mic: toggleMic.checked,
            tabId: activeTabId,
          })
          .catch(() => {});
      }
    );
  });

  // Stop is the PRIMARY control (the in-page badge is best effort only).
  // It is idempotent and force-closing: the service worker closes the offscreen
  // document even when no recorder exists.
  btnStopRecord.addEventListener('click', () => {
    if (currentRecordingState === STATE_STOPPING) return;
    chrome.runtime
      .sendMessage({
        action: ACTION_STOP_RECORDING_TRIGGER,
        target: ROLE_SW,
        source: 'popup',
      })
      .catch(() => {});
    renderRecordingState({ state: STATE_STOPPING });
    setTimeout(refreshRecordingState, 1000);
  });

  function refreshRecordingState() {
    chrome.runtime.sendMessage({ action: ACTION_GET_RECORDING_STATE, target: ROLE_SW }, res => {
      if (chrome.runtime.lastError || !res) {
        renderRecordingState({ state: STATE_IDLE });
        return;
      }
      renderRecordingState(res);
    });
  }

  const START_BUTTON_HTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10"/>
        </svg>
        Start Recording
      `;

  function renderCountdown() {
    if (currentRecordingState !== STATE_RECORDING) return;
    const remaining = Math.max(0, Math.ceil((countdownEndsAt - Date.now()) / 1000));
    captureStatus.textContent = `Recording in progress... (${remaining}s) - press Stop or use the page badge`;
  }

  function startCountdown() {
    if (recordInterval) return; // already ticking — never restart it
    recordInterval = setInterval(renderCountdown, 1000);
  }

  function stopCountdown() {
    if (recordInterval) {
      clearInterval(recordInterval);
      recordInterval = null;
    }
    countdownEndsAt = 0;
  }

  function startStatePoll() {
    if (statePoll) return; // exactly one poll
    statePoll = setInterval(refreshRecordingState, 2000);
  }

  function stopStatePoll() {
    if (statePoll) {
      clearInterval(statePoll);
      statePoll = null;
    }
  }

  function renderRecordingState(view) {
    const state = (view && view.state) || STATE_IDLE;
    currentRecordingState = state;

    if (state === STATE_IDLE) {
      stopCountdown();
      stopStatePoll();
      btnStartRecord.disabled = false;
      btnStartRecord.style.opacity = '1';
      btnStartRecord.innerHTML = START_BUTTON_HTML;
      btnStopRecord.style.display = 'none';
      btnStopRecord.disabled = false;
      btnStopRecord.style.opacity = '1';
      captureStatus.style.display = 'none';
      captureStatus.textContent = '';
      return;
    }

    btnStartRecord.disabled = true;
    btnStartRecord.style.opacity = '0.6';
    btnStopRecord.style.display = 'flex';
    captureStatus.style.display = 'block';
    captureStatus.className = 'status-bar';

    if (state === STATE_STARTING) {
      stopCountdown();
      btnStartRecord.innerHTML = 'Starting...';
      btnStopRecord.disabled = false;
      btnStopRecord.style.opacity = '1';
      captureStatus.textContent = 'Choose what to share in the Chrome picker...';
    } else if (state === STATE_RECORDING) {
      btnStartRecord.innerHTML = 'Recording...';
      btnStopRecord.disabled = false;
      btnStopRecord.style.opacity = '1';

      // Re-derive the end time from the authoritative session on every poll,
      // but leave the ticker itself running.
      const duration = view.duration || getRecordDuration() || 30;
      if (view.startedAt) {
        countdownEndsAt = view.startedAt + duration * 1000;
      } else if (!countdownEndsAt) {
        countdownEndsAt = Date.now() + duration * 1000;
      }
      renderCountdown();
      startCountdown();
    } else if (state === STATE_STOPPING) {
      stopCountdown();
      btnStartRecord.innerHTML = 'Recording...';
      btnStopRecord.disabled = true;
      btnStopRecord.style.opacity = '0.6';
      captureStatus.textContent = 'Finishing your recording...';
    }

    // Keep the popup honest about terminal transitions it did not observe.
    startStatePoll();
  }

  // Open editor / history
  btnOpenEditor.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('editor/editor.html?mode=image') });
    window.close();
  });

  btnViewHistory.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('editor/editor.html?mode=history') });
    window.close();
  });

  // Quick actions for image
  quickDownload.addEventListener('click', () => {
    if (!capturedImageDataUrl) return;

    const link = document.createElement('a');
    link.download = `snapcap-${Date.now()}.png`;
    link.href = capturedImageDataUrl;
    link.click();

    setStatus(statusBar, 'Downloaded!', 'success');
    quickDownload.classList.add('success');
    setTimeout(() => quickDownload.classList.remove('success'), 2000);
  });

  function dataURLtoBlob(dataUrl) {
    const parts = dataUrl.split(';base64,');
    const contentType = (parts[0] && parts[0].split(':')[1]) || 'image/png';
    const raw = window.atob(parts[1] || '');
    const uInt8Array = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
  }

  quickCopy.addEventListener('click', async () => {
    if (!capturedImageDataUrl) return;

    try {
      if (!navigator.clipboard || !navigator.clipboard.write) {
        setStatus(statusBar, 'Clipboard not supported', 'error');
        return;
      }

      const blob = dataURLtoBlob(capturedImageDataUrl);
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);

      setStatus(statusBar, 'Copied to clipboard!', 'success');
      quickCopy.classList.add('success');
      setTimeout(() => quickCopy.classList.remove('success'), 2000);
    } catch (err) {
      console.warn('Direct blob copy failed, attempting promise copy:', err);
      try {
        const blobPromise = fetch(capturedImageDataUrl).then(r => r.blob());
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })]);
        setStatus(statusBar, 'Copied to clipboard!', 'success');
      } catch (fallbackErr) {
        console.error('Failed to copy to clipboard:', fallbackErr);
        setStatus(statusBar, 'Failed to copy', 'error');
      }
    }
  });

  quickShare.addEventListener('click', async () => {
    if (!capturedImageDataUrl) return;

    try {
      const blob = dataURLtoBlob(capturedImageDataUrl);
      const file = new File([blob], 'snapcap-capture.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Snapcap Pro Capture',
          text: 'Check out my capture!',
        });
        setStatus(statusBar, 'Shared!', 'success');
      } else {
        // Desktop fallback: copy to clipboard!
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        setStatus(statusBar, 'Copied image to clipboard for sharing!', 'success');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setStatus(statusBar, 'Copied image to clipboard!', 'success');
      }
    }
  });

  // Quick actions for video
  quickDownloadVideo.addEventListener('click', () => {
    if (!capturedVideoBlob) return;

    const link = document.createElement('a');
    link.download = `snapcap-${Date.now()}.webm`;
    link.href = URL.createObjectURL(capturedVideoBlob);
    link.click();

    setStatus(statusBarVideo, 'Downloaded!', 'success');
    quickDownloadVideo.classList.add('success');
    setTimeout(() => quickDownloadVideo.classList.remove('success'), 2000);
  });

  quickShareVideo.addEventListener('click', async () => {
    if (!capturedVideoBlob) return;

    try {
      const file = new File([capturedVideoBlob], 'snapcap-recording.webm', { type: 'video/webm' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Snapcap Pro Recording',
          text: 'Check out my recording!',
        });
        setStatus(statusBarVideo, 'Shared!', 'success');
      } else {
        // Desktop fallback: trigger download!
        const link = document.createElement('a');
        link.download = `snapcap-${Date.now()}.webm`;
        link.href = URL.createObjectURL(capturedVideoBlob);
        link.click();
        setStatus(statusBarVideo, 'Downloaded recording to share!', 'success');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setStatus(statusBarVideo, 'Downloaded recording to share!', 'success');
      }
    }
  });

  // Navigation
  backBtn.addEventListener('click', () => {
    showPreview('main');
    capturedImageDataUrl = null;
    capturedImageId = null;
  });

  backBtnVideo.addEventListener('click', () => {
    showPreview('main');
    capturedVideoBlob = null;
    capturedVideoId = null;
  });

  // Edit opens the editor for the capture already saved by the background
  editBtn.addEventListener('click', () => {
    if (capturedImageId) {
      chrome.tabs.create({
        url: chrome.runtime.getURL(`editor/editor.html?mode=image&id=${capturedImageId}`),
      });
      window.close();
    } else if (capturedImageDataUrl) {
      saveToIndexedDB(capturedImageDataUrl, 'image', id => {
        chrome.tabs.create({
          url: chrome.runtime.getURL(`editor/editor.html?mode=image&id=${id}`),
        });
        window.close();
      });
    }
  });

  editBtnVideo.addEventListener('click', () => {
    if (capturedVideoId) {
      chrome.tabs.create({
        url: chrome.runtime.getURL(`editor/editor.html?mode=video&id=${capturedVideoId}`),
      });
      window.close();
    }
  });

  // Helper functions
  function showPreview(type) {
    mainView.style.display = type === 'main' ? 'flex' : 'none';
    previewView.style.display = type === 'image' ? 'flex' : 'none';
    videoPreviewView.style.display = type === 'video' ? 'flex' : 'none';
  }

  function setStatus(bar, message, type) {
    if (!bar) return;
    bar.textContent = message;
    bar.className = 'status-bar' + (type ? ' ' + type : '');
  }

  function showMainStatus(message, type) {
    captureStatus.textContent = message;
    captureStatus.className = 'status-bar' + (type ? ' ' + type : '');
    captureStatus.style.display = 'block';
  }

  function hideMainStatus() {
    captureStatus.style.display = 'none';
    captureStatus.className = 'status-bar';
    captureStatus.textContent = '';
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 70px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--surface);
      color: var(--text);
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      z-index: 2147483647;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SnapCapDB', 1);
      request.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('captures')) {
          db.createObjectStore('captures', { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function loadVideoCaptureById(id) {
    try {
      const db = await openDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('captures', 'readonly');
        const store = tx.objectStore('captures');
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result?.blob || null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error('Failed to load video:', err);
      return null;
    }
  }

  function saveToIndexedDB(dataUrl, type, callback) {
    openDB().then(db => {
      const tx = db.transaction('captures', 'readwrite');
      const store = tx.objectStore('captures');
      const id = type + '_' + crypto.randomUUID();

      store.put({
        id,
        type,
        dataUrl,
        timestamp: Date.now(),
      });

      tx.oncomplete = () => callback(id);
    });
  }
});
