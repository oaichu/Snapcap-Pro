document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const canvas = document.getElementById('studioCanvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const tabs = document.querySelectorAll('.tab');
  const panels = {
    image: document.getElementById('panelImage'),
    video: document.getElementById('panelVideo'),
    history: document.getElementById('panelHistory')
  };
  const tools = document.querySelectorAll('.tool[data-tool]');
  const colors = document.querySelectorAll('.color');
  const sizes = document.querySelectorAll('.tool[data-size]');
  const btnUndo = document.getElementById('btnUndo');
  const btnRedo = document.getElementById('btnRedo');
  const btnDownload = document.getElementById('btnDownload');
  const btnCopy = document.getElementById('btnCopy');
  const btnShare = document.getElementById('btnShare');
  const downloadLabel = document.getElementById('downloadLabel');
  const playerVideo = document.getElementById('playerVideo');
  const btnCaptureFrame = document.getElementById('btnCaptureFrame');
  const historyGrid = document.getElementById('historyGrid');
  const textModal = document.getElementById('textModal');
  const textInput = document.getElementById('textInput');
  const textCancel = document.getElementById('textCancel');
  const textConfirm = document.getElementById('textConfirm');
  const customColor = document.getElementById('customColor');

  // State
  let currentMode = 'image';
  let currentTool = 'pencil';
  let currentColor = '#ef4444';
  let currentSize = 4;
  let isDrawing = false;
  let startX = 0, startY = 0;
  let snapshot = null;
  let currentVideoBlob = null;
  const undoStack = [];
  const redoStack = [];
  const MAX_HISTORY = 20;

  // URL params
  const params = new URLSearchParams(window.location.search);
  const initialMode = params.get('mode') || 'image';
  const initialId = params.get('id');

  // Initialize
  switchTab(initialMode, initialId);

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.tab;
      switchTab(mode);
    });
  });

  function switchTab(mode, id = null, preserveCanvas = false) {
    currentMode = mode;
    
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === mode));
    Object.entries(panels).forEach(([key, panel]) => {
      panel.classList.toggle('active', key === mode);
    });

    if (mode === 'image') {
      downloadLabel.textContent = 'Download PNG';
      if (!preserveCanvas) loadImage(id);
    } else if (mode === 'video') {
      downloadLabel.textContent = 'Download WebM';
      loadVideo(id);
    } else if (mode === 'history') {
      loadHistory();
    }
  }

  // Tool selection
  tools.forEach(tool => {
    tool.addEventListener('click', () => {
      tools.forEach(t => t.classList.remove('active'));
      tool.classList.add('active');
      currentTool = tool.dataset.tool;
    });
  });

  // Color selection
  colors.forEach(color => {
    color.addEventListener('click', () => {
      colors.forEach(c => c.classList.remove('active'));
      color.classList.add('active');
      currentColor = color.dataset.color;
      customColor.value = currentColor;
    });
  });

  customColor.addEventListener('input', () => {
    currentColor = customColor.value;
    colors.forEach(c => c.classList.remove('active'));
  });

  // Size selection
  sizes.forEach(size => {
    size.addEventListener('click', () => {
      sizes.forEach(s => s.classList.remove('active'));
      size.classList.add('active');
      currentSize = parseInt(size.dataset.size);
    });
  });

  // Drawing handlers
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseleave', stopDrawing);

  function startDrawing(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    startX = (e.clientX - rect.left) * scaleX;
    startY = (e.clientY - rect.top) * scaleY;
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (currentTool === 'pencil') {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = currentSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else if (currentTool === 'text') {
      isDrawing = false;
      showTextModal();
    }
  }

  function draw(e) {
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (currentTool === 'pencil') {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.putImageData(snapshot, 0, 0);
      ctx.strokeStyle = currentColor;
      ctx.fillStyle = currentColor;
      ctx.lineWidth = currentSize;
      ctx.lineCap = 'round';

      if (currentTool === 'rect') {
        ctx.strokeRect(startX, startY, x - startX, y - startY);
      } else if (currentTool === 'circle') {
        const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
        ctx.beginPath();
        ctx.arc(startX, startY, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (currentTool === 'arrow') {
        drawArrow(startX, startY, x, y);
      } else if (currentTool === 'blur') {
        applyBlur(startX, startY, x - startX, y - startY);
      }
    }
  }

  function stopDrawing() {
    if (isDrawing) {
      isDrawing = false;
      saveState();
    }
  }

  function drawArrow(fromX, fromY, toX, toY) {
    const headLen = currentSize * 3 + 10;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }

  function applyBlur(x, y, w, h) {
    const rx = Math.round(w < 0 ? x + w : x);
    const ry = Math.round(h < 0 ? y + h : y);
    const rw = Math.abs(Math.round(w));
    const rh = Math.abs(Math.round(h));

    if (rw < 5 || rh < 5) return;

    const imgData = ctx.getImageData(rx, ry, rw, rh);
    const data = imgData.data;
    const pixelSize = 10;

    for (let py = 0; py < rh; py += pixelSize) {
      for (let px = 0; px < rw; px += pixelSize) {
        const i = (py * rw + px) * 4;
        ctx.fillStyle = `rgb(${data[i]}, ${data[i + 1]}, ${data[i + 2]})`;
        ctx.fillRect(rx + px, ry + py, pixelSize, pixelSize);
      }
    }
  }

  // Text modal
  function showTextModal() {
    textModal.style.display = 'flex';
    textInput.value = '';
    textInput.focus();
  }

  function hideTextModal() {
    textModal.style.display = 'none';
  }

  textCancel.addEventListener('click', hideTextModal);
  textConfirm.addEventListener('click', () => {
    const text = textInput.value.trim().slice(0, 500);
    if (text) {
      ctx.fillStyle = currentColor;
      ctx.font = `bold ${currentSize * 5 + 14}px Inter, sans-serif`;
      ctx.fillText(text, startX, startY);
      saveState();
    }
    hideTextModal();
  });

  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      textConfirm.click();
    }
    if (e.key === 'Escape') {
      hideTextModal();
    }
  });

  // Undo/Redo
  function saveState() {
    if (undoStack.length >= MAX_HISTORY) undoStack.shift();
    undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    redoStack.length = 0;
  }

  btnUndo.addEventListener('click', () => {
    if (undoStack.length > 1) {
      redoStack.push(undoStack.pop());
      ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
    }
  });

  btnRedo.addEventListener('click', () => {
    if (redoStack.length > 0) {
      const state = redoStack.pop();
      undoStack.push(state);
      ctx.putImageData(state, 0, 0);
    }
  });

  // Download
  btnDownload.addEventListener('click', () => {
    if (currentMode === 'image') {
      const link = document.createElement('a');
      link.download = `snapcap-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } else if (currentMode === 'video' && currentVideoBlob) {
      const link = document.createElement('a');
      link.download = `snapcap-${Date.now()}.webm`;
      link.href = URL.createObjectURL(currentVideoBlob);
      link.click();
    }
  });

  // Copy
  btnCopy.addEventListener('click', () => {
    if (currentMode !== 'image') return;
    
    canvas.toBlob((blob) => {
      if (blob && navigator.clipboard && navigator.clipboard.write) {
        navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]).then(() => {
          showNotification('Copied to clipboard!');
        }).catch(() => {
          showNotification('Failed to copy');
        });
      }
    });
  });

  // Share
  btnShare.addEventListener('click', async () => {
    try {
      let shareData = {
        title: 'SnapCap Capture',
        text: 'Check out my capture!'
      };

      if (currentMode === 'image') {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (blob && navigator.canShare?.({ files: [new File([blob], 'capture.png', { type: 'image/png' })] })) {
          shareData.files = [new File([blob], 'capture.png', { type: 'image/png' })];
        }
      } else if (currentMode === 'video' && currentVideoBlob) {
        if (navigator.canShare?.({ files: [new File([currentVideoBlob], 'recording.webm', { type: 'video/webm' })] })) {
          shareData.files = [new File([currentVideoBlob], 'recording.webm', { type: 'video/webm' })];
        }
      }

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        showNotification('Share not supported - use Copy or Download');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        showNotification('Share failed');
      }
    }
  });

  // Capture video frame
  btnCaptureFrame.addEventListener('click', () => {
    if (!playerVideo || playerVideo.readyState < 2) return;
    
    canvas.width = playerVideo.videoWidth;
    canvas.height = playerVideo.videoHeight;
    ctx.drawImage(playerVideo, 0, 0, canvas.width, canvas.height);
    saveState();
    switchTab('image', null, true);
  });

  // Load image from IndexedDB
  async function loadImage(targetId = null) {
    try {
      const db = await openDB();
      const tx = db.transaction('captures', 'readonly');
      const store = tx.objectStore('captures');
      const idToLoad = targetId || new URLSearchParams(window.location.search).get('id');
      
      const req = idToLoad ? store.get(idToLoad) : store.getAll();

      req.onsuccess = () => {
        let item = null;
        if (idToLoad) {
          item = req.result;
        } else if (req.result?.length > 0) {
          const images = req.result.filter(r => r.type === 'image');
          item = images.sort((a, b) => b.timestamp - a.timestamp)[0];
        }

        if (item?.dataUrl) {
          const img = new Image();
          img.onload = () => {
            const maxSize = 4000;
            const maxMP = 16;
            let w = img.width, h = img.height;

            if (w > maxSize || h > maxSize) {
              const scale = Math.min(maxSize / w, maxSize / h);
              w = Math.round(w * scale);
              h = Math.round(h * scale);
            }

            const mp = (w * h) / 1000000;
            if (mp > maxMP) {
              const scale = Math.sqrt(maxMP / mp);
              w = Math.round(w * scale);
              h = Math.round(h * scale);
            }

            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);
            saveState();
          };
          img.src = item.dataUrl;
        } else {
          canvas.width = 800;
          canvas.height = 500;
          ctx.fillStyle = '#1a1a25';
          ctx.fillRect(0, 0, 800, 500);
          ctx.fillStyle = '#8b8b9e';
          ctx.font = '16px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('No screenshot captured yet', 400, 250);
          saveState();
        }
      };
    } catch (e) {
      console.error('Failed to load image:', e);
    }
  }

  // Load video from IndexedDB
  async function loadVideo(targetId = null) {
    try {
      const db = await openDB();
      const tx = db.transaction('captures', 'readonly');
      const store = tx.objectStore('captures');
      const idToLoad = targetId || new URLSearchParams(window.location.search).get('id');
      
      const req = idToLoad ? store.get(idToLoad) : store.getAll();

      req.onsuccess = () => {
        let item = null;
        if (idToLoad) {
          item = req.result;
        } else if (req.result?.length > 0) {
          const videos = req.result.filter(r => r.type === 'video');
          item = videos.sort((a, b) => b.timestamp - a.timestamp)[0];
        }

        if (item?.blob) {
          currentVideoBlob = item.blob;
          playerVideo.src = URL.createObjectURL(item.blob);
        }
      };
    } catch (e) {
      console.error('Failed to load video:', e);
    }
  }

  // Load history
  async function loadHistory() {
    historyGrid.innerHTML = '<p style="color:var(--text-secondary)">Loading...</p>';
    
    try {
      const db = await openDB();
      const tx = db.transaction('captures', 'readonly');
      const store = tx.objectStore('captures');
      const req = store.getAll();

      req.onsuccess = () => {
        const items = req.result || [];
        historyGrid.innerHTML = '';

        if (items.length === 0) {
          historyGrid.innerHTML = '<p style="color:var(--text-secondary)">No captures yet</p>';
          return;
        }

        items.sort((a, b) => b.timestamp - a.timestamp).forEach(item => {
          const card = document.createElement('div');
          card.className = 'history-card';

          if (item.type === 'video' && item.blob) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(item.blob);
            video.muted = true;
            card.appendChild(video);
          } else if (item.dataUrl) {
            const img = document.createElement('img');
            img.src = item.dataUrl;
            card.appendChild(img);
          }

          const info = document.createElement('div');
          info.className = 'history-card-info';
          info.innerHTML = `
            <span class="history-card-type">${item.type.toUpperCase()}</span>
            <span>${new Date(item.timestamp).toLocaleDateString()}</span>
          `;
          card.appendChild(info);
          historyGrid.appendChild(card);
        });
      };
    } catch (e) {
      historyGrid.innerHTML = '<p style="color:var(--text-secondary)">Error loading history</p>';
    }
  }

  // IndexedDB helper
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

  // Notification
  function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--surface);
      color: var(--text);
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }
});