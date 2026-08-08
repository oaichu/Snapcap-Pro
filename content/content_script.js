(() => {
  if (window.__snapcapLoaded) return;
  window.__snapcapLoaded = true;

  let isSelecting = false;
  let startX, startY;
  let selectionBox = null;
  let cropParams = null;

  // Listen for messages
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'START_COUNTDOWN') {
      runCountdown(msg.delay, () => sendResponse({ status: 'done' }));
      return true;
    }

    if (msg.action === 'TRIGGER_SELECTION') {
      startSelection();
      sendResponse({ status: 'started' });
      return true;
    }

    if (msg.action === 'EXECUTE_FULL_PAGE_SCROLL') {
      captureFullPage().then(tiles => {
        sendResponse({ status: 'success', tiles });
      }).catch(err => {
        sendResponse({ status: 'error', error: err.message });
      });
      return true;
    }

    if (msg.action === 'SHOW_RECORD_BADGE') {
      showRecordBadge(msg.duration);
      sendResponse({ status: 'badge_shown' });
      return true;
    }

    if (msg.action === 'HIDE_RECORD_BADGE') {
      hideRecordBadge();
      sendResponse({ status: 'badge_hidden' });
      return true;
    }

    if (msg.action === 'SHOW_TOAST') {
      showToast(msg.message);
      sendResponse({ status: 'toast_shown' });
      return true;
    }
  });

  function runCountdown(seconds, callback) {
    let overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8); display: flex; align-items: center;
      justify-content: center; z-index: 2147483647; font-family: system-ui;
    `;
    let num = document.createElement('div');
    num.style.cssText = 'font-size: 120px; font-weight: 700; color: white;';
    num.textContent = seconds;
    overlay.appendChild(num);
    document.body.appendChild(overlay);

    let count = seconds;
    let timer = setInterval(() => {
      count--;
      if (count > 0) {
        num.textContent = count;
      } else {
        clearInterval(timer);
        overlay.remove();
        if (callback) callback();
      }
    }, 1000);
  }

  function startSelection() {
    if (document.getElementById('snapcap-selection')) return;

    let container = document.createElement('div');
    container.id = 'snapcap-selection';
    container.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.4); cursor: crosshair; z-index: 2147483647;
    `;

    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        container.remove();
        document.removeEventListener('keydown', escHandler);
      }
    });

    container.addEventListener('mousedown', (e) => {
      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;

      selectionBox = document.createElement('div');
      selectionBox.style.cssText = `
        position: fixed; border: 2px solid #6366f1; background: rgba(99,102,241,0.1);
        pointer-events: none; z-index: 2147483648;
      `;
      document.body.appendChild(selectionBox);
    });

    container.addEventListener('mousemove', (e) => {
      if (!isSelecting || !selectionBox) return;

      const x = Math.min(startX, e.clientX);
      const y = Math.min(startY, e.clientY);
      const w = Math.abs(e.clientX - startX);
      const h = Math.abs(e.clientY - startY);

      selectionBox.style.left = x + 'px';
      selectionBox.style.top = y + 'px';
      selectionBox.style.width = w + 'px';
      selectionBox.style.height = h + 'px';

      cropParams = {
        x: Math.round(x * window.devicePixelRatio),
        y: Math.round(y * window.devicePixelRatio),
        width: Math.round(w * window.devicePixelRatio),
        height: Math.round(h * window.devicePixelRatio)
      };
    });

    container.addEventListener('mouseup', () => {
      isSelecting = false;
      if (cropParams && cropParams.width > 10 && cropParams.height > 10) {
        chrome.runtime.sendMessage({ action: 'CROP_VISIBLE_TAB', crop: cropParams }, res => {
          if (res && res.dataUrl) {
            showCaptureOverlay(res.dataUrl, res.id);
          } else if (res && res.error) {
            showToast(res.error);
          }
        });
      }
      container.remove();
      if (selectionBox) selectionBox.remove();
    });

    document.body.appendChild(container);
  }

  async function captureFullPage() {
    const MAX_HEIGHT = 15000;
    const MAX_ATTEMPTS = 5;

    const totalHeight = Math.min(
      Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight
      ),
      MAX_HEIGHT
    );

    const viewportHeight = window.innerHeight;
    const originalScroll = window.scrollY;
    const tiles = [];
    let currentScroll = 0;
    let noScrollCount = 0;
    let prevScrollY = -1;

    // Hide fixed elements
    const fixedElements = [];
    document.querySelectorAll('*').forEach(el => {
      const style = window.getComputedStyle(el);
      if (style.position === 'fixed' || style.position === 'sticky') {
        fixedElements.push({ el, vis: el.style.visibility });
      }
    });

    window.scrollTo(0, 0);
    await sleep(200);

    while (currentScroll < totalHeight) {
      window.scrollTo(0, currentScroll);
      await sleep(200);

      const actualY = window.scrollY;
      if (actualY === prevScrollY) {
        noScrollCount++;
        if (noScrollCount >= MAX_ATTEMPTS) break;
      } else {
        noScrollCount = 0;
      }
      prevScrollY = actualY;

      // Hide fixed elements after first tile
      if (tiles.length === 0) {
        fixedElements.forEach(({ el, vis }) => {
          el.style.visibility = 'hidden';
        });
      }

      const dataUrl = await new Promise(resolve => {
        chrome.runtime.sendMessage({ action: 'CAPTURE_TAB_PROMISE' }, res => {
          resolve(res?.dataUrl || null);
        });
      });

      if (dataUrl) {
        tiles.push({
          y: actualY,
          viewportHeight,
          totalHeight,
          devicePixelRatio: window.devicePixelRatio || 1,
          dataUrl
        });
      }

      if (currentScroll + viewportHeight >= totalHeight) break;
      currentScroll += viewportHeight - 20;
    }

    // Restore
    window.scrollTo(0, originalScroll);
    fixedElements.forEach(({ el, vis }) => {
      el.style.visibility = vis;
    });

    return tiles;
  }

  function showRecordBadge(duration) {
    if (document.getElementById('snapcap-badge')) return;

    let badge = document.createElement('div');
    badge.id = 'snapcap-badge';
    badge.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 2147483647;
      background: #ef4444; color: white; padding: 10px 16px;
      border-radius: 8px; font-family: system-ui; font-size: 14px;
      font-weight: 600; display: flex; align-items: center; gap: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;

    let timer = duration;
    badge.innerHTML = `
      <span style="width:8px;height:8px;background:white;border-radius:50%;animation:pulse 1s infinite"></span>
      <span id="snapcap-timer">${timer}s</span>
      <button id="snapcap-stop" style="background:white;color:#ef4444;border:none;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:600;cursor:pointer;">Stop</button>
    `;
    document.body.appendChild(badge);

    let interval = setInterval(() => {
      timer--;
      let timerEl = document.getElementById('snapcap-timer');
      if (timerEl) timerEl.textContent = timer + 's';
      if (timer <= 0) clearInterval(interval);
    }, 1000);

    document.getElementById('snapcap-stop').addEventListener('click', () => {
      clearInterval(interval);
      chrome.runtime.sendMessage({ action: 'STOP_RECORDING_TRIGGER' });
      hideRecordBadge();
    });
  }

  function hideRecordBadge() {
    let badge = document.getElementById('snapcap-badge');
    if (badge) badge.remove();
  }

  // In-page result overlay with quick actions (used when the popup is closed,
  // e.g. after drag-select).
  function showCaptureOverlay(dataUrl, captureId) {
    if (document.getElementById('snapcap-result')) return;

    const overlay = document.createElement('div');
    overlay.id = 'snapcap-result';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(10,10,15,0.75); display: flex; align-items: center;
      justify-content: center; z-index: 2147483647; font-family: Inter, system-ui, sans-serif;
      backdrop-filter: blur(4px);
    `;

    const card = document.createElement('div');
    card.style.cssText = `
      background: #12121a; border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px; padding: 16px; max-width: min(560px, 90vw);
      box-shadow: 0 24px 80px rgba(0,0,0,0.6); text-align: center;
    `;

    const img = document.createElement('img');
    img.src = dataUrl;
    img.style.cssText = `
      max-width: 100%; max-height: 55vh; border-radius: 10px; display: block;
      margin: 0 auto 14px; background: #000;
    `;

    const title = document.createElement('div');
    title.textContent = 'Captured!';
    title.style.cssText = `
      font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 12px;
    `;

    const actions = document.createElement('div');
    actions.style.cssText = `
      display: flex; gap: 8px; justify-content: center;
    `;

    const makeBtn = (label, primary) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.cssText = `
        flex: 1; padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);
        background: ${primary ? '#6366f1' : '#1a1a25'}; color: #fff; font-size: 13px;
        font-weight: 600; cursor: pointer; font-family: inherit; min-width: 72px;
        transition: transform 0.1s ease;
      `;
      btn.onmousedown = () => { btn.style.transform = 'scale(0.96)'; };
      btn.onmouseup = () => { btn.style.transform = 'scale(1)'; };
      return btn;
    };

    const btnDownload = makeBtn('Download', false);
    const btnCopy = makeBtn('Copy', false);
    const btnShare = makeBtn('Share', false);
    const btnEdit = makeBtn('Edit', true);

    btnDownload.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        action: 'DOWNLOAD_IMAGE',
        dataUrl,
        filename: `snapcap-${Date.now()}.png`
      });
      showOverlayToast('Downloading...');
    });

    btnCopy.addEventListener('click', async () => {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        if (navigator.clipboard && navigator.clipboard.write) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          showOverlayToast('Copied to clipboard!');
        } else {
          showOverlayToast('Copy not supported here - use Download');
        }
      } catch (err) {
        showOverlayToast('Copy failed - use Download');
      }
    });

    btnShare.addEventListener('click', async () => {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], 'snapcap-capture.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'SnapCap Capture' });
        } else {
          showOverlayToast('Share not supported here - use Download');
        }
      } catch (err) {
        if (err.name !== 'AbortError') showOverlayToast('Share failed');
      }
    });

    btnEdit.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'OPEN_EDITOR', mode: 'image', id: captureId });
      overlay.remove();
    });

    actions.append(btnDownload, btnCopy, btnShare, btnEdit);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
      margin-top: 12px; background: none; border: none; color: #8b8b9e;
      font-size: 12px; cursor: pointer; font-family: inherit;
    `;
    closeBtn.addEventListener('click', () => overlay.remove());

    card.append(title, img, actions, closeBtn);
    overlay.appendChild(card);

    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.remove();
    });

    document.addEventListener('keydown', function escResult(e) {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', escResult);
      }
    });

    document.body.appendChild(overlay);
  }

  function showOverlayToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
      background: #12121a; color: #fff; padding: 10px 16px; border-radius: 8px;
      font-family: Inter, system-ui, sans-serif; font-size: 13px; font-weight: 500;
      z-index: 2147483647; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  function showToast(message) {
    let toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
      background: #12121a; color: white; padding: 10px 16px;
      border-radius: 8px; font-family: system-ui; font-size: 13px;
      font-weight: 500; z-index: 2147483647; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
})();