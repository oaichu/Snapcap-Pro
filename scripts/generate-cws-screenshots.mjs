import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const rootDir = resolve('D:/CODE/SnapCap-Pro');
const storeAssetsDir = resolve(rootDir, 'store-assets');
const tempDir = resolve(rootDir, '.temp-render');

if (!existsSync(storeAssetsDir)) mkdirSync(storeAssetsDir, { recursive: true });
if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });

const chromeCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
];
const browserPath = chromeCandidates.find(p => existsSync(p));

function renderToPng(htmlContent, width, height, outputPath) {
  const tempHtmlPath = resolve(tempDir, `temp_${Date.now()}_${Math.random().toString(36).substring(7)}.html`);
  writeFileSync(tempHtmlPath, htmlContent, 'utf8');

  const cmd = `"${browserPath}" --headless --disable-gpu --hide-scrollbars --window-size=${width},${height} --screenshot="${outputPath}" "file:///${tempHtmlPath.replace(/\\/g, '/')}"`;
  execSync(cmd, { stdio: 'ignore' });

  try {
    if (existsSync(tempHtmlPath)) unlinkSync(tempHtmlPath);
  } catch (e) {}

  console.log(`✔ Generated: ${outputPath} (${width}x${height})`);
}

// -------------------------------------------------------------
// SNAPCAP SCREENSHOT 1: 3-IN-1 CAPTURE ENGINE (1280x800)
// -------------------------------------------------------------
const shot1 = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif; }
  body { width:1280px; height:800px; background:#0B0F19; padding:40px; display:flex; flex-direction:column; gap:20px; color:#F8FAFC; }
  .header { display:flex; justify-content:space-between; align-items:center; }
  .title-area h2 { font-size:26px; font-weight:800; letter-spacing:-0.8px; color:#fff; }
  .title-area p { font-size:14px; color:#94A3B8; margin-top:4px; }
  .tag { padding:6px 14px; border-radius:999px; font-size:12px; font-weight:700; background:rgba(0,245,255,0.15); border:1px solid rgba(0,245,255,0.3); color:#00F5FF; }
  .canvas-area {
    flex:1; background:#111728; border:1px solid rgba(255,255,255,0.12); border-radius:16px;
    display:flex; overflow:hidden; position:relative; box-shadow:0 25px 60px rgba(0,0,0,0.7);
  }
  .left-pane { flex:1; padding:32px; display:flex; flex-direction:column; justify-content:space-between; }
  .mode-cards { display:flex; flex-direction:column; gap:14px; margin-top:10px; }
  .mode-card {
    background:#161F36; border:1px solid rgba(255,255,255,0.08); border-radius:14px;
    padding:16px 20px; display:flex; align-items:center; gap:16px;
  }
  .mode-card.active { border-color:#00F5FF; background:rgba(0,245,255,0.08); box-shadow:0 0 25px rgba(0,245,255,0.15); }
  .mode-icon { width:44px; height:44px; border-radius:12px; background:#1E293B; display:flex; align-items:center; justify-content:center; font-size:22px; }
  .mode-info h4 { font-size:16px; font-weight:800; color:#fff; }
  .mode-info p { font-size:12px; color:#94A3B8; margin-top:2px; }
  .right-pane { width:460px; background:#0D1322; border-left:1px solid rgba(255,255,255,0.08); padding:28px; display:flex; flex-direction:column; justify-content:center; align-items:center; }
  .popup-mockup {
    width:340px; background:#161F36; border:1px solid rgba(255,255,255,0.15); border-radius:16px;
    overflow:hidden; box-shadow:0 20px 50px rgba(0,0,0,0.8);
  }
  .popup-top { height:46px; background:#1E294B; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:space-between; padding:0 16px; font-size:13px; font-weight:800; color:#00F5FF; }
  .popup-body { padding:20px; display:flex; flex-direction:column; gap:12px; }
  .p-btn { padding:14px; border-radius:10px; font-size:13px; font-weight:700; display:flex; align-items:center; gap:10px; cursor:pointer; }
  .p-btn-pri { background:linear-gradient(135deg, #00F5FF 0%, #0066FF 100%); color:#fff; border:none; }
  .p-btn-sec { background:#1F2A48; color:#E2E8F0; border:1px solid rgba(255,255,255,0.08); }
</style>
</head>
<body>
  <div class="header">
    <div class="title-area">
      <h2>Full Page, Visible Area &amp; Precision Crop Snip</h2>
      <p>Capture entire long-form articles, dynamic web apps, or pixel-perfect coordinate boxes instantly.</p>
    </div>
    <div class="tag">STUDIO 01 • CAPTURE MODES</div>
  </div>

  <div class="canvas-area">
    <div class="left-pane">
      <div class="mode-cards">
        <div class="mode-card active">
          <div class="mode-icon">📜</div>
          <div class="mode-info">
            <h4>Full Page Intelligent Stitching</h4>
            <p>Smooth autoscroll capture with sticky header elimination and zero seams.</p>
          </div>
        </div>
        <div class="mode-card">
          <div class="mode-icon">📐</div>
          <div class="mode-info">
            <h4>Drag &amp; Snap Precision Crop</h4>
            <p>Real-time crosshair coordinate magnifier with dimension overlay (W x H).</p>
          </div>
        </div>
        <div class="mode-card">
          <div class="mode-icon">🖥️</div>
          <div class="mode-info">
            <h4>Visible Viewport Snip</h4>
            <p>Instantaneous capture of visible screen at native device pixel ratio.</p>
          </div>
        </div>
      </div>
      <div style="font-size:12px; color:#64748B; font-weight:600;">⚡ MV3 Offscreen Canvas Architecture • Zero Quality Loss</div>
    </div>

    <div class="right-pane">
      <div class="popup-mockup">
        <div class="popup-top">
          <span>SnapCap Pro Studio</span>
          <span style="font-size:10px; background:rgba(0,245,255,0.2); padding:2px 6px; border-radius:4px;">v1.1.0</span>
        </div>
        <div class="popup-body">
          <div class="p-btn p-btn-pri">📸 Capture Full Page (Alt+Shift+F)</div>
          <div class="p-btn p-btn-sec">✂️ Selected Area Crop (Alt+Shift+S)</div>
          <div class="p-btn p-btn-sec">📹 30s Quick Video Clip (Alt+Shift+V)</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

renderToPng(shot1, 1280, 800, resolve(storeAssetsDir, 'screenshot-1-capture-modes.png'));

// -------------------------------------------------------------
// SNAPCAP SCREENSHOT 2: 30s 4K SCREEN RECORDER (1280x800)
// -------------------------------------------------------------
const shot2 = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif; }
  body { width:1280px; height:800px; background:#0B0F19; padding:40px; display:flex; flex-direction:column; gap:20px; color:#F8FAFC; }
  .header { display:flex; justify-content:space-between; align-items:center; }
  .title-area h2 { font-size:26px; font-weight:800; letter-spacing:-0.8px; color:#fff; }
  .title-area p { font-size:14px; color:#94A3B8; margin-top:4px; }
  .tag { padding:6px 14px; border-radius:999px; font-size:12px; font-weight:700; background:rgba(255,0,122,0.15); border:1px solid rgba(255,0,122,0.3); color:#FF007A; }
  .recorder-frame {
    flex:1; background:#111728; border:1px solid rgba(255,255,255,0.12); border-radius:16px;
    padding:32px; display:flex; flex-direction:column; justify-content:space-between;
    box-shadow:0 25px 60px rgba(0,0,0,0.7); position:relative; overflow:hidden;
  }
  .rec-banner {
    display:flex; justify-content:space-between; align-items:center; background:#161F36;
    border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:18px 24px;
  }
  .rec-badge { display:flex; align-items:center; gap:10px; font-size:16px; font-weight:800; color:#fff; }
  .rec-dot { width:14px; height:14px; border-radius:50%; background:#EF4444; box-shadow:0 0 12px #EF4444; }
  .rec-timer { font-family:monospace; font-size:24px; font-weight:900; color:#00F5FF; }
  .video-preview {
    flex:1; margin:20px 0; background:#070A11; border:1px solid rgba(255,255,255,0.08); border-radius:14px;
    display:flex; align-items:center; justify-content:center; position:relative;
  }
  .play-glow { width:80px; height:80px; border-radius:50%; background:linear-gradient(135deg, #FF007A, #7000FF); display:flex; align-items:center; justify-content:center; box-shadow:0 0 30px rgba(255,0,122,0.4); }
  .features-strip { display:grid; grid-template-columns:repeat(4, 1fr); gap:14px; }
  .feat-box { background:#161F36; border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:14px; text-align:center; }
  .feat-box .num { font-size:18px; font-weight:800; color:#00F5FF; font-family:monospace; }
  .feat-box .lbl { font-size:11px; color:#94A3B8; margin-top:4px; }
</style>
</head>
<body>
  <div class="header">
    <div class="title-area">
      <h2>30-Second High-Fidelity Screen Recording Studio</h2>
      <p>Record short, punchy walkthrough clips with tab and microphone audio. Export to WebM or MP4.</p>
    </div>
    <div class="tag">STUDIO 02 • SCREEN RECORDER</div>
  </div>

  <div class="recorder-frame">
    <div class="rec-banner">
      <div class="rec-badge">
        <div class="rec-dot"></div>
        <span>RECORDING ACTIVE</span>
      </div>
      <div class="rec-timer">00:23 / 00:30</div>
      <div style="font-size:12px; color:#10B981; font-weight:700;">🎙️ DUAL AUDIO SYNCED</div>
    </div>

    <div class="video-preview">
      <div class="play-glow">
        <div style="width:0; height:0; border-top:12px solid transparent; border-bottom:12px solid transparent; border-left:20px solid #fff; margin-left:4px;"></div>
      </div>
    </div>

    <div class="features-strip">
      <div class="feat-box"><div class="num">4K 60FPS</div><div class="lbl">Native Resolution</div></div>
      <div class="feat-box"><div class="num">ZERO CLOUD</div><div class="lbl">100% On-Device</div></div>
      <div class="feat-box"><div class="num">WebM / MP4</div><div class="lbl">Optimized Bitrate</div></div>
      <div class="feat-box"><div class="num">0 WATERMARKS</div><div class="lbl">Forever Free</div></div>
    </div>
  </div>
</body>
</html>`;

renderToPng(shot2, 1280, 800, resolve(storeAssetsDir, 'screenshot-2-video-recording.png'));

// -------------------------------------------------------------
// SNAPCAP SCREENSHOT 3: ANNOTATION STUDIO (1280x800)
// -------------------------------------------------------------
const shot3 = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif; }
  body { width:1280px; height:800px; background:#0B0F19; padding:40px; display:flex; flex-direction:column; gap:20px; color:#F8FAFC; }
  .header { display:flex; justify-content:space-between; align-items:center; }
  .title-area h2 { font-size:26px; font-weight:800; letter-spacing:-0.8px; color:#fff; }
  .title-area p { font-size:14px; color:#94A3B8; margin-top:4px; }
  .tag { padding:6px 14px; border-radius:999px; font-size:12px; font-weight:700; background:rgba(112,0,255,0.15); border:1px solid rgba(112,0,255,0.3); color:#A855F7; }
  .editor-frame {
    flex:1; background:#111728; border:1px solid rgba(255,255,255,0.12); border-radius:16px;
    display:flex; flex-direction:column; overflow:hidden; box-shadow:0 25px 60px rgba(0,0,0,0.7);
  }
  .toolbar {
    height:54px; background:#161F36; border-bottom:1px solid rgba(255,255,255,0.08);
    display:flex; align-items:center; justify-content:space-between; padding:0 24px;
  }
  .tool-group { display:flex; gap:8px; }
  .t-btn {
    padding:8px 14px; border-radius:8px; font-size:12px; font-weight:700; background:#1E294B;
    border:1px solid rgba(255,255,255,0.08); color:#CBD5E1; display:flex; align-items:center; gap:6px;
  }
  .t-btn.active { background:linear-gradient(135deg, #00F5FF, #0066FF); color:#fff; border:none; }
  .editor-canvas { flex:1; background:#070A11; position:relative; overflow:hidden; padding:40px; }
  .annotated-box {
    position:absolute; top:80px; left:120px; width:480px; height:240px;
    border:2px dashed #00F5FF; border-radius:12px; background:rgba(0,245,255,0.03);
    padding:20px;
  }
  .step-bubble {
    width:32px; height:32px; border-radius:50%; background:#FF007A; color:#fff;
    display:flex; align-items:center; justify-content:center; font-weight:900; font-size:15px;
    position:absolute; top:-16px; left:-16px; box-shadow:0 4px 12px rgba(255,0,122,0.5);
  }
  .blur-redact-box {
    position:absolute; top:120px; right:120px; width:340px; height:90px;
    background:rgba(255,255,255,0.1); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
    border:1px solid rgba(255,255,255,0.2); border-radius:8px; display:flex; align-items:center; justify-content:center;
    color:#fff; font-size:13px; font-weight:700; letter-spacing:1px;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="title-area">
      <h2>Complete Built-in Annotation &amp; Privacy Blur Studio</h2>
      <p>Arrows, step counters, callout notes, freehand drawing, and pixel-level privacy redaction.</p>
    </div>
    <div class="tag">STUDIO 03 • ANNOTATION SUITE</div>
  </div>

  <div class="editor-frame">
    <div class="toolbar">
      <div class="tool-group">
        <div class="t-btn active">➔ Arrow</div>
        <div class="t-btn">① Steps</div>
        <div class="t-btn">⬛ Rectangle</div>
        <div class="t-btn">T Text</div>
        <div class="t-btn" style="color:#FF007A;">🔒 Blur / Redact</div>
      </div>
      <div class="tool-group">
        <div class="t-btn">Undo (Ctrl+Z)</div>
        <div class="t-btn" style="background:#10B981; color:#fff;">Save PNG</div>
      </div>
    </div>

    <div class="editor-canvas">
      <div class="annotated-box">
        <div class="step-bubble">1</div>
        <h3 style="color:#00F5FF; font-size:18px;">Critical Architecture Review</h3>
        <p style="color:#94A3B8; font-size:13px; margin-top:8px;">Direct step callouts allow instant asynchronous communication across remote engineering teams.</p>
      </div>

      <div class="blur-redact-box">
        🔒 PRIVACY REDACTION APPLIED
      </div>
    </div>
  </div>
</body>
</html>`;

renderToPng(shot3, 1280, 800, resolve(storeAssetsDir, 'screenshot-3-annotation-studio.png'));

// -------------------------------------------------------------
// SNAPCAP SCREENSHOT 4: ZERO PAYWALL & INSTANT SHARING (1280x800)
// -------------------------------------------------------------
const shot4 = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif; }
  body { width:1280px; height:800px; background:#0B0F19; padding:40px; display:flex; flex-direction:column; gap:20px; color:#F8FAFC; }
  .header { display:flex; justify-content:space-between; align-items:center; }
  .title-area h2 { font-size:26px; font-weight:800; letter-spacing:-0.8px; color:#fff; }
  .title-area p { font-size:14px; color:#94A3B8; margin-top:4px; }
  .tag { padding:6px 14px; border-radius:999px; font-size:12px; font-weight:700; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); color:#10B981; }
  .card-wrap {
    flex:1; background:#111728; border:1px solid rgba(255,255,255,0.12); border-radius:18px;
    padding:40px; display:flex; flex-direction:column; justify-content:space-between;
    box-shadow:0 25px 60px rgba(0,0,0,0.7);
  }
  .comp-table { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
  .comp-col { background:#161F36; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:24px; }
  .comp-col.snapcap { border-color:#00F5FF; background:rgba(0,245,255,0.04); }
  .comp-title { font-size:18px; font-weight:800; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; }
  .comp-item { display:flex; align-items:center; gap:10px; font-size:14px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.05); }
</style>
</head>
<body>
  <div class="header">
    <div class="title-area">
      <h2>100% Free Open-Source Community Promise</h2>
      <p>No monthly subscriptions, no gated full-page captures, zero watermarks, and no mandatory cloud accounts.</p>
    </div>
    <div class="tag">PROMISE 04 • 100% FREE</div>
  </div>

  <div class="card-wrap">
    <div class="comp-table">
      <div class="comp-col">
        <div class="comp-title" style="color:#F87171;">
          <span>Other Commercial Tools</span>
          <span style="font-size:12px; color:#64748B;">$15 - $29 / month</span>
        </div>
        <div class="comp-item"><span style="color:#EF4444;">✕</span> Full page capture locked behind paywall</div>
        <div class="comp-item"><span style="color:#EF4444;">✕</span> Ugly branding watermarks on video export</div>
        <div class="comp-item"><span style="color:#EF4444;">✕</span> Mandatory account login &amp; cloud upload</div>
        <div class="comp-item"><span style="color:#EF4444;">✕</span> Third-party telemetry &amp; tracking cookies</div>
      </div>

      <div class="comp-col snapcap">
        <div class="comp-title" style="color:#00F5FF;">
          <span>SnapCap Pro</span>
          <span style="font-size:12px; background:#00F5FF; color:#0B0F19; padding:2px 8px; border-radius:6px; font-weight:800;">FREE FOREVER</span>
        </div>
        <div class="comp-item"><span style="color:#00F5FF;">✔</span> 100% Unlimited Full Page Capture</div>
        <div class="comp-item"><span style="color:#00F5FF;">✔</span> 0 Watermarks on WebM / MP4 video exports</div>
        <div class="comp-item"><span style="color:#00F5FF;">✔</span> 1-Click Clipboard Copy (Ctrl+V into Slack, Discord, GitHub)</div>
        <div class="comp-item"><span style="color:#00F5FF;">✔</span> 100% Local-First &amp; Open Source (MIT License)</div>
      </div>
    </div>

    <div style="text-align:center; font-size:13px; color:#64748B; font-weight:600;">
      Built by the developer community for creators, engineers, and designers.
    </div>
  </div>
</body>
</html>`;

renderToPng(shot4, 1280, 800, resolve(storeAssetsDir, 'screenshot-4-instant-sharing.png'));

// Copy real icon128.png
const srcIcon = resolve(rootDir, 'icons/icon128.png');
const destIcon = resolve(storeAssetsDir, 'icon128.png');
if (existsSync(srcIcon)) {
  execSync(`powershell -Command "Copy-Item '${srcIcon}' '${destIcon}' -Force"`);
  console.log(`✔ Copied real 128x128 icon to store-assets/icon128.png`);
}

console.log('\n🎉 ALL SNAPCAP PRO STORE ASSETS SUCCESSFULLY CREATED!');
