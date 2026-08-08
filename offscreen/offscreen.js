// SnapCap Offscreen - MediaRecorder engine

let mediaRecorder = null;
let recordedChunks = [];
let recordTimeout = null;

// Tell the service worker this document finished loading and is ready
// to receive recording commands.
chrome.runtime.sendMessage({ action: 'OFFSCREEN_READY' }).catch(() => {});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'OFFSCREEN_START_RECORDING') {
    startRecording(msg.streamId, msg.duration || 30, msg.mic);
    sendResponse({ status: 'recording_started' });
    return true;
  }

  if (msg.action === 'OFFSCREEN_STOP_RECORDING') {
    stopRecording();
    sendResponse({ status: 'recording_stopping' });
    return true;
  }
});

async function startRecording(streamId, duration, includeMic) {
  try {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      console.warn('Recording already in progress');
      return;
    }

    recordedChunks = [];
    if (recordTimeout) clearTimeout(recordTimeout);

    const constraints = {
      audio: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: streamId
        }
      },
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: streamId,
          maxFrameRate: 60
        }
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    if (includeMic) {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        micStream.getAudioTracks().forEach(track => stream.addTrack(track));
      } catch (err) {
        console.warn('Mic access denied:', err);
      }
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    mediaRecorder = new MediaRecorder(stream, { mimeType });

    mediaRecorder.ondataavailable = e => {
      if (e.data?.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      try {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const id = await saveVideo(blob);
        chrome.runtime.sendMessage({ action: 'RECORDING_COMPLETE', blobSize: blob.size, id });
      } catch (err) {
        chrome.runtime.sendMessage({ action: 'RECORDING_ERROR', error: err.message });
      } finally {
        mediaRecorder = null;
        recordedChunks = [];
        recordTimeout = null;
      }
    };

    mediaRecorder.onerror = e => {
      chrome.runtime.sendMessage({ action: 'RECORDING_ERROR', error: e.error?.message || 'Recording failed' });
      mediaRecorder = null;
      recordedChunks = [];
      if (recordTimeout) clearTimeout(recordTimeout);
    };

    mediaRecorder.start(500);

    recordTimeout = setTimeout(() => {
      if (mediaRecorder?.state === 'recording') stopRecording();
    }, duration * 1000);

  } catch (err) {
    chrome.runtime.sendMessage({ action: 'RECORDING_ERROR', error: err.message });
  }
}

function stopRecording() {
  if (recordTimeout) clearTimeout(recordTimeout);
  if (mediaRecorder?.state !== 'inactive') mediaRecorder.stop();
}

window.addEventListener('beforeunload', () => {
  if (recordTimeout) clearTimeout(recordTimeout);
  if (mediaRecorder?.state !== 'inactive') mediaRecorder.stop();
});

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