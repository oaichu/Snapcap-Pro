// SnapCap Background Service Worker

let offscreenCreating = null;
let offscreenReadyFlag = false;
let offscreenReadyWaiters = [];

// Ensure offscreen document exists
async function setupOffscreen(path) {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(path)]
  });

  if (contexts.length > 0) {
    return;
  }

  if (offscreenCreating) {
    await offscreenCreating;
  } else {
    offscreenReadyFlag = false;
    offscreenCreating = chrome.offscreen.createDocument({
      url: path,
      reasons: ['USER_MEDIA', 'DISPLAY_MEDIA'],
      justification: 'Record screen and audio for short clips'
    });
    await offscreenCreating;
    offscreenCreating = null;
  }
}

// Wait until offscreen finished loading so its message listener is registered
function waitForOffscreenReady(timeout = 3000) {
  if (offscreenReadyFlag) return Promise.resolve();
  return new Promise(resolve => {
    const timer = setTimeout(done, timeout);
    function done() {
      clearTimeout(timer);
      resolve();
    }
    offscreenReadyWaiters.push(done);
  });
}

function _markOffscreenReady() {
  offscreenReadyFlag = true;
  const waiters = offscreenReadyWaiters;
  offscreenReadyWaiters = [];
  waiters.forEach(w => w());
}

function isPopupOpen() {
  return chrome.runtime.getContexts({ contextTypes: ['POPUP'] })
    .then(contexts => contexts.length > 0)
    .catch(() => false);
}

// Message handler
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.action) {
    case 'CAPTURE_VISIBLE':
      captureVisible(sendResponse);
      return true;

    case 'CAPTURE_TAB_PROMISE':
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, dataUrl => {
        sendResponse({ dataUrl });
      });
      return true;

    case 'CAPTURE_SELECTED':
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'TRIGGER_SELECTION' })
            .catch(err => console.warn('Content script not ready:', err));
        }
      });
      break;

    case 'CROP_VISIBLE_TAB':
      captureCropped(msg.crop, sendResponse);
      return true;

    case 'CAPTURE_FULL_PAGE':
      captureFullPage(sendResponse);
      return true;

    case 'START_RECORDING':
      startRecording(msg.duration, msg.mic);
      break;

    case 'STOP_RECORDING_TRIGGER':
      stopRecording();
      break;

    case 'RECORDING_COMPLETE':
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'HIDE_RECORD_BADGE' }).catch(() => {});
        }
      });
      chrome.storage.local.remove('recordingActive');
      handleRecordingComplete(msg.id);
      chrome.offscreen.closeDocument().catch(() => {});
      break;

    case 'RECORDING_ERROR':
      chrome.storage.local.remove('recordingActive');
      sendToPopup({ action: 'RECORDING_ERROR', error: msg.error || 'Recording failed' });
      break;

    case 'OFFSCREEN_READY':
      _markOffscreenReady();
      break;

    case 'CAPTURE_RESULT_IN_PAGE':
      // handled in content script; ignore here
      break;

    case 'OPEN_EDITOR':
      openEditor(msg.mode || 'image', msg.id || '');
      break;

    case 'DOWNLOAD_IMAGE':
      chrome.downloads.download({
        url: msg.dataUrl,
        filename: msg.filename || `snapcap-${Date.now()}.png`,
        saveAs: false
      });
      if (sendResponse) sendResponse({ ok: true });
      return true;
  }
});

// Send a message to an open popup (if any). No-op when closed.
function sendToPopup(msg) {
  isPopupOpen().then(open => {
    if (open) {
      chrome.runtime.sendMessage(msg).catch(() => {});
    }
  });
}

// Capture visible area -> respond directly to the requester (popup)
function captureVisible(sendResponse) {
  chrome.tabs.captureVisibleTab(null, { format: 'png' }, dataUrl => {
    if (!dataUrl) {
      sendResponse({ error: 'Capture failed. Make sure the active tab is a normal website (not chrome://).' });
      return;
    }
    saveToIndexedDB(dataUrl, 'image', id => {
      sendResponse({ dataUrl, id });
    });
  });
}

// Capture cropped area -> respond directly to the content script
function captureCropped(crop, sendResponse) {
  chrome.tabs.captureVisibleTab(null, { format: 'png' }, dataUrl => {
    if (!dataUrl) {
      sendResponse({ error: 'Capture failed' });
      return;
    }

    fetch(dataUrl)
      .then(res => res.blob())
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

    chrome.tabs.sendMessage(tabs[0].id, { action: 'EXECUTE_FULL_PAGE_SCROLL' }, res => {
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
            sendResponse({ dataUrl: stitchedUrl, id });
          });
        });
      } else {
        sendResponse({ error: 'Could not scroll the page' });
      }
    });
  });
}

// Stitch tiles together
async function stitchTiles(tiles) {
  if (tiles.length === 1) {
    return tiles[0].dataUrl;
  }

  try {
    const firstBitmap = await fetch(tiles[0].dataUrl).then(r => r.blob()).then(createImageBitmap);
    const dpr = tiles[0].devicePixelRatio || 1;
    const totalHeight = Math.round(tiles[0].totalHeight * dpr);
    const width = firstBitmap.width;
    firstBitmap.close();

    const canvas = new OffscreenCanvas(width, totalHeight);
    const ctx = canvas.getContext('2d');

    for (const tile of tiles) {
      const bitmap = await fetch(tile.dataUrl).then(r => r.blob()).then(createImageBitmap);
      const drawY = Math.round(tile.y * dpr);
      ctx.drawImage(bitmap, 0, drawY);
      bitmap.close();
    }

    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('Stitch failed:', err);
    return null;
  }
}

// Screen recording
async function startRecording(duration, mic) {
  await setupOffscreen('offscreen/offscreen.html');
  await waitForOffscreenReady();
  await chrome.storage.local.set({ recordingActive: true });

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]) return;

    chrome.desktopCapture.chooseDesktopMedia(['screen', 'window', 'tab'], tabs[0], streamId => {
      if (!streamId) {
        chrome.storage.local.remove('recordingActive');
        sendToPopup({ action: 'RECORDING_CANCELLED' });
        chrome.tabs.sendMessage(tabs[0].id, { action: 'SHOW_TOAST', message: 'Recording cancelled' }).catch(() => {});
        return;
      }

      chrome.runtime.sendMessage({
        action: 'OFFSCREEN_START_RECORDING',
        streamId,
        duration,
        mic
      }).catch(() => {});

      chrome.tabs.sendMessage(tabs[0].id, { action: 'SHOW_RECORD_BADGE', duration }).catch(() => {});
    });
  });
}

function stopRecording() {
  chrome.runtime.sendMessage({ action: 'OFFSCREEN_STOP_RECORDING' }).catch(() => {});
}

function handleRecordingComplete(id) {
  // The video blob lives in IndexedDB. If the popup is open, tell it to load
  // the capture by id; otherwise open the editor for it.
  isPopupOpen().then(open => {
    if (open) {
      chrome.runtime.sendMessage({ action: 'CAPTURE_VIDEO_RESULT', id }).catch(() => {});
    } else {
      openEditor('video', id);
    }
  });
}

// Save to IndexedDB
function saveToIndexedDB(dataUrl, type, callback) {
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
    const id = type + '_' + crypto.randomUUID();

    store.put({
      id,
      type,
      dataUrl,
      timestamp: Date.now()
    });

    tx.oncomplete = () => callback(id);
  };
}

// Open editor
function openEditor(mode, id = '') {
  const baseUrl = chrome.runtime.getURL('editor/editor.html');
  const url = id ? `${baseUrl}?mode=${mode}&id=${id}` : `${baseUrl}?mode=${mode}`;
  chrome.tabs.create({ url });
}