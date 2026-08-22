(() => {
  if (window.__snapcapLoaded) return;
  window.__snapcapLoaded = true;

  // Wire-protocol action strings are duplicated per file; keep spellings consistent with §0 of the plan.
  const ROLE = 'content';
  const ROLE_SW = 'sw';
  const ACTION_STOP_RECORDING_TRIGGER = 'STOP_RECORDING_TRIGGER';

  let cropParams = null;

  // Listen for messages
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || typeof msg.action !== 'string') return;
    if (msg.target && msg.target !== ROLE) return; // §0 target discipline

    if (msg.action === 'START_COUNTDOWN') {
      runCountdown(msg.delay, () => sendResponse({ status: 'done' }));
      return true;
    }

    if (msg.action === 'TRIGGER_SELECTION') {
      startSelection();
      sendResponse({ status: 'started' });
      return;
    }

    if (msg.action === 'EXECUTE_FULL_PAGE_SCROLL') {
      captureFullPage()
        .then(tiles => {
          sendResponse({ status: 'success', tiles });
        })
        .catch(err => {
          sendResponse({ status: 'error', error: err.message });
        });
      return true;
    }

    if (msg.action === 'SHOW_RECORD_BADGE') {
      showRecordBadge(msg.duration, msg.startedAt);
      sendResponse({ status: 'badge_shown' });
      return;
    }

    if (msg.action === 'HIDE_RECORD_BADGE') {
      hideRecordBadge();
      sendResponse({ status: 'badge_hidden' });
      return;
    }

    if (msg.action === 'SHOW_TOAST') {
      showToast(msg.message);
      sendResponse({ status: 'toast_shown' });
      return;
    }
  });

  function runCountdown(seconds, callback) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8); display: flex; align-items: center;
      justify-content: center; z-index: 2147483647; font-family: system-ui;
    `;
    const num = document.createElement('div');
    num.style.cssText = 'font-size: 120px; font-weight: 700; color: white;';
    num.textContent = seconds;
    overlay.appendChild(num);
    document.body.appendChild(overlay);

    let count = seconds;
    const timer = setInterval(() => {
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

    cropParams = null;
    let isSelecting = false;
    let startX = 0;
    let startY = 0;
    let selectionBox = null;
    let selectionSizeLabel = null;

    const container = document.createElement('div');
    container.id = 'snapcap-selection';

    function teardownSelection() {
      document.removeEventListener('keydown', escHandler);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      isSelecting = false;
      if (container.parentNode) container.remove();
      if (selectionBox && selectionBox.parentNode) {
        selectionBox.remove();
      }
      selectionBox = null;
      selectionSizeLabel = null;
    }

    function escHandler(e) {
      if (e.key === 'Escape') teardownSelection();
    }

    function onMouseMove(e) {
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
        height: Math.round(h * window.devicePixelRatio),
      };

      if (selectionSizeLabel) {
        selectionSizeLabel.textContent = `${Math.round(w)} × ${Math.round(h)} px`;
      }
    }

    async function onMouseUp() {
      if (!isSelecting) {
        teardownSelection();
        return;
      }
      isSelecting = false;

      const finalCrop = cropParams;
      teardownSelection();

      if (finalCrop && finalCrop.width > 10 && finalCrop.height > 10) {
        // Wait a tick for selection overlay to disappear from screen before capturing
        await new Promise(r => setTimeout(r, 60));
        chrome.runtime.sendMessage(
          { action: 'CROP_VISIBLE_TAB', target: ROLE_SW, crop: finalCrop },
          res => {
            if (res && res.dataUrl) {
              showCaptureOverlay(res.dataUrl, res.id);
            } else if (res && res.error) {
              showToast(res.error);
            }
          }
        );
      }
    }

    document.addEventListener('keydown', escHandler);

    container.addEventListener('mousedown', e => {
      e.preventDefault();
      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;
      cropParams = null;

      selectionBox = document.createElement('div');
      selectionBox.id = 'snapcap-selection-box';
      const sizeLabel = document.createElement('span');
      sizeLabel.id = 'snapcap-selection-size';
      selectionSizeLabel = sizeLabel;
      selectionBox.appendChild(sizeLabel);
      document.body.appendChild(selectionBox);

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    document.body.appendChild(container);
  }

  // -------------------------------------------------------------------------
  // Full page capture
  // -------------------------------------------------------------------------
  const MIN_CAPTURE_INTERVAL_MS = 500; // chrome.tabs.captureVisibleTab allows ~2/s
  const CAPTURE_BACKOFF_MS = 1200;
  const MAX_TILES = 30;
  const MAX_SCAN_NODES = 600;
  const MAX_SCAN_DEPTH = 4;

  let lastCaptureAt = 0;

  // Bounded replacement for querySelectorAll('*') + getComputedStyle on every
  // node: fixed/sticky chrome lives near the top of the tree (M-2).
  function collectFixedElements() {
    const found = [];
    const queue = [];
    const root = document.body;
    if (!root) return found;

    for (const child of root.children) queue.push({ el: child, depth: 0 });

    let scanned = 0;
    while (queue.length && scanned < MAX_SCAN_NODES) {
      const { el, depth } = queue.shift();
      scanned++;

      let position = '';
      try {
        position = window.getComputedStyle(el).position;
      } catch (err) {
        continue;
      }

      if (position === 'fixed' || position === 'sticky') {
        found.push({ el, vis: el.style.visibility });
        continue; // descendants inherit the ancestor's visibility
      }

      if (depth < MAX_SCAN_DEPTH) {
        for (const child of el.children) queue.push({ el: child, depth: depth + 1 });
      }
    }

    return found;
  }

  async function captureTile() {
    const wait = MIN_CAPTURE_INTERVAL_MS - (Date.now() - lastCaptureAt);
    if (wait > 0) await sleep(wait);

    for (let attempt = 0; attempt < 2; attempt++) {
      lastCaptureAt = Date.now();
      const res = await new Promise(resolve => {
        chrome.runtime.sendMessage({ action: 'CAPTURE_TAB_PROMISE', target: ROLE_SW }, reply =>
          resolve(reply || { dataUrl: null, error: 'No response' })
        );
      });

      if (res.dataUrl) return res.dataUrl;
      if (!/Exceeded maximum|rate-limit/i.test(res.error || '')) return null;

      await sleep(CAPTURE_BACKOFF_MS); // back off and retry once
    }

    return null;
  }

  async function captureFullPage() {
    const MAX_HEIGHT = 15000;

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
    const originalHtmlScrollBehavior = document.documentElement.style.scrollBehavior;
    const originalBodyScrollBehavior = document.body.style.scrollBehavior;

    // Force instant scrolling (suppress CSS smooth-scroll animations during capture)
    document.documentElement.style.scrollBehavior = 'auto';
    document.body.style.scrollBehavior = 'auto';

    const tiles = [];
    let currentScroll = 0;
    let prevScrollY = -1;

    // finally does not run if the frame is destroyed mid-loop, so abort as
    // soon as the page starts going away (L-3).
    let aborted = false;
    const abort = () => {
      aborted = true;
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') aborted = true;
    };
    window.addEventListener('pagehide', abort);
    document.addEventListener('visibilitychange', onVisibility);

    const fixedElements = collectFixedElements();

    try {
      window.scrollTo(0, 0);
      await sleep(250);

      while (currentScroll < totalHeight && !aborted && tiles.length < MAX_TILES) {
        window.scrollTo(0, currentScroll);
        await sleep(250);

        const actualY = window.scrollY;
        if (actualY === prevScrollY && tiles.length > 0) {
          // Page cannot scroll any further; reached bottom
          break;
        }
        prevScrollY = actualY;

        // Hide fixed elements after the first tile to prevent repeated headers
        if (tiles.length === 0) {
          fixedElements.forEach(({ el }) => {
            el.style.visibility = 'hidden';
          });
        }

        const dataUrl = await captureTile();
        if (aborted) break;

        if (dataUrl) {
          tiles.push({
            y: actualY,
            viewportHeight,
            totalHeight,
            devicePixelRatio: window.devicePixelRatio || 1,
            dataUrl,
          });
        }

        if (currentScroll + viewportHeight >= totalHeight) break;
        currentScroll += viewportHeight - 20;
      }
    } finally {
      window.removeEventListener('pagehide', abort);
      document.removeEventListener('visibilitychange', onVisibility);
      document.documentElement.style.scrollBehavior = originalHtmlScrollBehavior;
      document.body.style.scrollBehavior = originalBodyScrollBehavior;
      window.scrollTo(0, originalScroll);
      fixedElements.forEach(({ el, vis }) => {
        el.style.visibility = vis;
      });
    }

    return tiles;
  }

  // -------------------------------------------------------------------------
  // Recording badge (best effort; the popup Stop button is primary — L-2)
  // -------------------------------------------------------------------------
  const BADGE_TTL_GRACE_MS = 15000;
  let badgeInterval = null;
  let badgeTtlTimer = null;

  function showRecordBadge(duration, startedAt) {
    if (document.getElementById('snapcap-badge')) return;

    const total = Math.max(1, parseInt(duration, 10) || 30);
    const started = typeof startedAt === 'number' && startedAt > 0 ? startedAt : Date.now();
    const endsAt = started + total * 1000;

    const remaining = () => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));

    const badge = document.createElement('div');
    badge.id = 'snapcap-badge'; // base styling lives in content/overlay.css

    badge.innerHTML = `
      <span class="snapcap-badge-dot"></span>
      <span id="snapcap-timer">${remaining()}s</span>
      <button id="snapcap-stop">Stop</button>
    `;
    document.body.appendChild(badge);

    badgeInterval = setInterval(() => {
      const timerEl = document.getElementById('snapcap-timer');
      if (!timerEl) {
        hideRecordBadge();
        return;
      }
      timerEl.textContent = remaining() + 's';
    }, 1000);

    // Self-removal: the badge must never outlive the session, even if the
    // service worker died before it could send HIDE_RECORD_BADGE.
    badgeTtlTimer = setTimeout(
      hideRecordBadge,
      Math.max(0, endsAt - Date.now()) + BADGE_TTL_GRACE_MS
    );

    const stopBtn = document.getElementById('snapcap-stop');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({
          action: ACTION_STOP_RECORDING_TRIGGER,
          target: ROLE_SW,
          source: 'badge',
        });
        hideRecordBadge();
      });
    }
  }

  // Idempotent: safe to call any number of times, badge present or not.
  function hideRecordBadge() {
    if (badgeInterval) {
      clearInterval(badgeInterval);
      badgeInterval = null;
    }
    if (badgeTtlTimer) {
      clearTimeout(badgeTtlTimer);
      badgeTtlTimer = null;
    }
    const badge = document.getElementById('snapcap-badge');
    if (badge) badge.remove();
  }

  // -------------------------------------------------------------------------
  // In-page result overlay, isolated in a CLOSED shadow root.
  // The light-DOM attribute marker is the single existence check; teardown
  // always removes the HOST, which nukes the subtree regardless of shadow mode.
  // -------------------------------------------------------------------------
  const HOST_MARKER = 'data-snapcap-host';
  const OVERLAY_MAX_LIFETIME_MS = 120000;

  let overlayHost = null;
  let overlayRoot = null; // retained ShadowRoot (mode: 'closed')
  let overlayEscHandler = null;
  let overlayLifetimeTimer = null;
  let resultCardMounted = false;

  function overlayHostExists() {
    return !!document.querySelector('[' + HOST_MARKER + ']');
  }

  function ensureOverlayRoot() {
    if (overlayHost && document.contains(overlayHost) && overlayRoot) return overlayRoot;

    // Drop any orphan host left behind by a previous injection.
    const orphan = document.querySelector('[' + HOST_MARKER + ']');
    if (orphan) orphan.remove();

    overlayHost = document.createElement('div');
    overlayHost.setAttribute(HOST_MARKER, '');
    overlayHost.style.cssText = `
      all: initial; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      z-index: 2147483647; pointer-events: none;
    `;
    overlayRoot = overlayHost.attachShadow({ mode: 'closed' });
    (document.body || document.documentElement).appendChild(overlayHost);
    return overlayRoot;
  }

  // THE single teardown chokepoint for all SnapCap in-page UI.
  function destroyOverlay() {
    if (overlayLifetimeTimer) {
      clearTimeout(overlayLifetimeTimer);
      overlayLifetimeTimer = null;
    }
    if (overlayEscHandler) {
      document.removeEventListener('keydown', overlayEscHandler, true);
      overlayEscHandler = null;
    }
    resultCardMounted = false;

    const host = document.querySelector('[' + HOST_MARKER + ']');
    if (host) host.remove();
    if (overlayHost && overlayHost.parentNode) overlayHost.remove();

    overlayHost = null;
    overlayRoot = null;
  }

  // Removes a transient node (toast); tears the host down once nothing is left.
  function dismissOverlayNode(node) {
    if (node && node.parentNode) node.parentNode.removeChild(node);
    if (!overlayRoot) return;
    if (!resultCardMounted && overlayRoot.childElementCount === 0) destroyOverlay();
  }

  function showCaptureOverlay(dataUrl, captureId) {
    if (resultCardMounted && overlayHostExists()) return;

    const root = ensureOverlayRoot();

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(10,10,15,0.65); display: flex; align-items: center;
      justify-content: center; font-family: -apple-system, system-ui, sans-serif;
      backdrop-filter: blur(24px) saturate(180%); -webkit-backdrop-filter: blur(24px) saturate(180%);
      pointer-events: auto;
    `;

    const card = document.createElement('div');
    card.style.cssText = `
      background: rgba(26,26,32,0.92); border: 1px solid rgba(255,255,255,0.12);
      border-radius: 20px; padding: 20px; max-width: min(560px, 90vw);
      box-shadow: 0 32px 96px rgba(0,0,0,0.6); text-align: center;
      pointer-events: auto;
    `;

    const img = document.createElement('img');
    img.src = dataUrl;
    img.style.cssText = `
      max-width: 100%; max-height: 55vh; border-radius: 14px; display: block;
      margin: 0 auto 16px; background: #000;
    `;

    const title = document.createElement('div');
    title.textContent = 'Captured!';
    title.style.cssText = `
      font-size: 17px; font-weight: 700; color: #fff; margin-bottom: 16px;
      letter-spacing: -0.2px;
    `;

    const actions = document.createElement('div');
    actions.style.cssText = `
      display: flex; gap: 8px; justify-content: center;
    `;

    const makeBtn = (label, primary) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.cssText = `
        flex: 1; padding: 10px 14px; border-radius: 12px; border: 1px solid ${primary ? 'transparent' : 'rgba(255,255,255,0.12)'};
        background: ${primary ? 'linear-gradient(180deg, #0a84ff, #0066d6)' : 'rgba(255,255,255,0.08)'}; color: #fff; font-size: 13px;
        font-weight: 600; cursor: pointer; font-family: inherit; min-width: 76px;
        transition: transform 0.12s ease, filter 0.12s ease;
      `;
      btn.onmousedown = () => {
        btn.style.transform = 'scale(0.95)';
      };
      btn.onmouseup = () => {
        btn.style.transform = 'scale(1)';
      };
      btn.onmouseenter = () => {
        btn.style.filter = 'brightness(1.1)';
      };
      btn.onmouseleave = () => {
        btn.style.filter = 'none';
      };
      return btn;
    };

    const btnDownload = makeBtn('Download', false);
    const btnCopy = makeBtn('Copy', false);
    const btnShare = makeBtn('Share', false);
    const btnEdit = makeBtn('Edit', true);

    btnDownload.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        action: 'DOWNLOAD_IMAGE',
        target: ROLE_SW,
        dataUrl,
        filename: `snapcap-${Date.now()}.png`,
      });
      showOverlayToast('Downloading...');
    });

    btnCopy.addEventListener('click', async () => {
      try {
        if (!navigator.clipboard || !navigator.clipboard.write) {
          showOverlayToast('Copy not supported here - use Download');
          return;
        }

        const blobPromise = fetch(dataUrl).then(r => r.blob());
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })]);
        showOverlayToast('Copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy in content script overlay:', err);
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
      chrome.runtime.sendMessage({
        action: 'OPEN_EDITOR',
        target: ROLE_SW,
        mode: 'image',
        id: captureId,
      });
      destroyOverlay();
    });

    actions.append(btnDownload, btnCopy, btnShare, btnEdit);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
      margin-top: 14px; background: none; border: none; color: rgba(235,235,245,0.55);
      font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit;
      transition: color 0.15s ease;
    `;
    closeBtn.onmouseenter = () => {
      closeBtn.style.color = 'rgba(235,235,245,0.9)';
    };
    closeBtn.onmouseleave = () => {
      closeBtn.style.color = 'rgba(235,235,245,0.55)';
    };
    closeBtn.addEventListener('click', () => destroyOverlay());

    card.append(title, img, actions, closeBtn);
    overlay.appendChild(card);

    overlay.addEventListener('click', e => {
      if (e.target === overlay) destroyOverlay();
    });

    overlayEscHandler = e => {
      if (e.key === 'Escape') destroyOverlay();
    };
    document.addEventListener('keydown', overlayEscHandler, true);

    overlayLifetimeTimer = setTimeout(destroyOverlay, OVERLAY_MAX_LIFETIME_MS);

    root.appendChild(overlay);
    resultCardMounted = true;
  }

  function mountToast(message, ttl) {
    const root = ensureOverlayRoot();
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
      background: rgba(26,26,32,0.9); border: 1px solid rgba(255,255,255,0.12);
      color: #f5f5f7; padding: 10px 18px; border-radius: 999px;
      font-family: -apple-system, system-ui, sans-serif; font-size: 13px; font-weight: 500;
      box-shadow: 0 12px 40px rgba(0,0,0,0.4);
      backdrop-filter: blur(24px) saturate(180%); -webkit-backdrop-filter: blur(24px) saturate(180%);
      pointer-events: auto;
    `;
    toast.textContent = message;
    root.appendChild(toast);
    setTimeout(() => dismissOverlayNode(toast), ttl);
  }

  function showOverlayToast(message) {
    mountToast(message, 2500);
  }

  function showToast(message) {
    mountToast(message, 3000);
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
})();
