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
  const btnOpenEditor = document.getElementById('openEditorHome');
  const btnViewHistory = document.getElementById('viewHistoryBtn');
  const toggleMic = document.getElementById('toggleMic');
  const recordLimit = document.getElementById('recordLimit');
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
  let recordInterval = null;

  // Load preferences
  chrome.storage.local.get(['micEnabled', 'recordDuration', 'captureDelay', 'recordingActive'], (res) => {
    if (res.micEnabled !== undefined) toggleMic.checked = res.micEnabled;
    if (res.recordDuration) recordLimit.value = res.recordDuration;
    if (res.captureDelay) delaySelect.value = res.captureDelay;
    // Restore recording UI if a recording is still in progress
    if (res.recordingActive) {
      setRecordingState(true, parseInt(recordLimit.value, 10) || 30);
    }
  });

  // Save preferences
  toggleMic.addEventListener('change', () => {
    chrome.storage.local.set({ micEnabled: toggleMic.checked });
  });

  recordLimit.addEventListener('change', () => {
    chrome.storage.local.set({ recordDuration: parseInt(recordLimit.value, 10) });
  });

  delaySelect.addEventListener('change', () => {
    chrome.storage.local.set({ captureDelay: parseInt(delaySelect.value, 10) });
  });

  // Push messages from the background (only used for the async flows:
  // video result + recording errors/cancels).
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'CAPTURE_VIDEO_RESULT' && msg.id) {
      setRecordingState(false);
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

    if (msg.action === 'RECORDING_ERROR') {
      setRecordingState(false);
      showToast('Recording failed: ' + (msg.error || 'unknown error'));
    }

    if (msg.action === 'RECORDING_CANCELLED') {
      setRecordingState(false);
      showToast('Recording cancelled');
    }
  });

  // Capture functions
  const triggerCapture = (actionType) => {
    const delay = parseInt(delaySelect.value, 10);

    const execute = () => {
      showMainStatus('Capturing...');
      chrome.runtime.sendMessage({ action: actionType }, (res) => {
        if (res && res.dataUrl) {
          capturedImageDataUrl = res.dataUrl;
          capturedImageId = res.id;
          previewImage.src = res.dataUrl;
          hideMainStatus();
          showPreview('image');
          setStatus(statusBar, 'Captured! Download, copy, or share.', 'success');
        } else if (res && res.error) {
          showMainStatus(res.error, 'error');
          showToast(res.error);
        }
      });
    };

    if (actionType === 'CAPTURE_SELECTED') {
      // The content script puts a selection overlay on the page. The popup will
      // close the moment the user clicks/drags on the page; the result is shown
      // in-page afterwards.
      showMainStatus('Drag to select an area on the page.');
      chrome.runtime.sendMessage({ action: 'CAPTURE_SELECTED' });
      return;
    }

    if (delay > 0) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
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
    let duration = parseInt(recordLimit.value, 10);
    if (isNaN(duration) || duration < 10) duration = 30;
    if (duration > 30) duration = 30;

    chrome.runtime.sendMessage({ action: 'START_RECORDING', duration, mic: toggleMic.checked });
    setRecordingState(true, duration);
  });

  function setRecordingState(active, duration) {
    if (active) {
      btnStartRecord.disabled = true;
      btnStartRecord.style.opacity = '0.6';
      btnStartRecord.innerHTML = 'Recording...';
      captureStatus.style.display = 'block';
      captureStatus.className = 'status-bar';

      let remaining = duration;
      captureStatus.textContent = `Recording in progress... (${remaining}s) - watch the badge on the page`;

      if (recordInterval) clearInterval(recordInterval);
      recordInterval = setInterval(() => {
        remaining--;
        if (remaining >= 0) {
          captureStatus.textContent = `Recording in progress... (${remaining}s) - watch the badge on the page`;
        }
      }, 1000);
    } else {
      if (recordInterval) clearInterval(recordInterval);
      recordInterval = null;
      btnStartRecord.disabled = false;
      btnStartRecord.style.opacity = '1';
      btnStartRecord.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10"/>
        </svg>
        Start Recording
      `;
      captureStatus.style.display = 'none';
      captureStatus.textContent = '';
    }
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

  quickCopy.addEventListener('click', async () => {
    if (!capturedImageDataUrl) return;

    try {
      const response = await fetch(capturedImageDataUrl);
      const blob = await response.blob();

      if (navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setStatus(statusBar, 'Copied to clipboard!', 'success');
        quickCopy.classList.add('success');
        setTimeout(() => quickCopy.classList.remove('success'), 2000);
      } else {
        setStatus(statusBar, 'Clipboard not supported', 'error');
      }
    } catch (err) {
      setStatus(statusBar, 'Failed to copy', 'error');
    }
  });

  quickShare.addEventListener('click', async () => {
    if (!capturedImageDataUrl) return;

    try {
      const response = await fetch(capturedImageDataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'snapcap-capture.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'SnapCap Capture',
          text: 'Check out my capture!'
        });
        setStatus(statusBar, 'Shared!', 'success');
      } else {
        setStatus(statusBar, 'Share not supported - use Copy or Download', 'error');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setStatus(statusBar, 'Share failed', 'error');
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
          title: 'SnapCap Recording',
          text: 'Check out my recording!'
        });
        setStatus(statusBarVideo, 'Shared!', 'success');
      } else {
        setStatus(statusBarVideo, 'Share not supported - use Download', 'error');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setStatus(statusBarVideo, 'Share failed', 'error');
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
      chrome.tabs.create({ url: chrome.runtime.getURL(`editor/editor.html?mode=image&id=${capturedImageId}`) });
      window.close();
    } else if (capturedImageDataUrl) {
      saveToIndexedDB(capturedImageDataUrl, 'image', (id) => {
        chrome.tabs.create({ url: chrome.runtime.getURL(`editor/editor.html?mode=image&id=${id}`) });
        window.close();
      });
    }
  });

  editBtnVideo.addEventListener('click', () => {
    if (capturedVideoId) {
      chrome.tabs.create({ url: chrome.runtime.getURL(`editor/editor.html?mode=video&id=${capturedVideoId}`) });
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
      request.onupgradeneeded = (e) => {
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
    openDB().then((db) => {
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
    });
  }
});