# SnapCap Pro v1.1.0 — Official Release Notes

**Summary:** SnapCap Pro is now **100% free and open-source for the community** under the **MIT License**. This release introduces a complete brand redesign (High-Velocity Creator Studio aesthetic), bulletproof Manifest V3 capture & recording engines, and a comprehensive local History & Storage Manager.

---

## 🌟 What's New in v1.1.0

### 1. 🎨 High-Velocity Creator Studio Branding

- **Master Freestanding Vector Logo**: Pure borderless, high-energy monogram "S" + creator play slash glyph on 100% transparent background.
- **High-DPI Retina Icon Suite**: Re-rendered 16x16, 48x48, 128x128, and 512x512 PNG assets.
- **Dark Studio Hero Banner**: 1280x640 high-impact graphic banner for repository & store listings (`assets/snapcap-hero-banner.png`).

### 2. 📸 Synchronous Binary Screenshot & Stitching Engine

- **Fixed Selected Area Crop**: Replaced fragile `fetch(dataUrl)` with synchronous binary decoding `dataUrlToBlob()`, eliminating `TypeError: Failed to fetch` in Chrome MV3 Service Workers.
- **Clamped Coordinate Sub-Pixel Guard**: Automatic dimensional clamping preventing `IndexSizeError` on multi-monitor high-DPI scaling displays (125% / 150% scale).
- **Full Page Auto-Stitch**: Smooth multi-tile vertical stitching up to 16,384px with automatic memory downscaling safeguards.

### 3. 🎥 Direct Manifest V3 Screen & Audio Recorder

- **Offscreen `getDisplayMedia` Architecture**: Upgraded to persistent background recording that never gets interrupted when popups close.
- **Dual-Channel Audio Mixing**: Native `AudioContext` mixing for simultaneous system/tab audio and microphone voiceover.
- **Graceful Fallback**: Automatic video-only fallback if OS system audio is restricted on specific windows or display drivers.

### 4. 🗄️ Smart History & Storage Manager

- **Individual Item Deletion (🗑️)**: Remove specific captures from local IndexedDB with 1 click to free disk space.
- **Direct Clipboard Copy (📋)**: Copy raw PNG image bytes directly to system clipboard for pasting into Slack, Figma, Zalo, Discord, or Notion.
- **Instant Download (⬇️)**: Export PNG or WebM files immediately.
- **Studio Editor Bridge (✏️)**: 1-click loading of any past screenshot into canvas annotation or video into player.
- **Storage Estimator & Purge (🧹)**: Real-time MB calculation with a confirmation-guarded "Clear All History" feature.

---

## 🧪 Verification & Test Results

```bash
PASS | session becomes RECORDING
PASS | session carries tabId 42
PASS | in-page badge shown at tab 42
PASS | in-page badge carries duration
PASS | stop reached the offscreen recorder
PASS | recording delivered to editor when popup closed
PASS | session returns to IDLE after completion
PASS | badge hidden on the session tab
PASS | offscreen document closed
PASS | missing tabId falls back to active tab
PASS | fallback badge still shown
PASS | garbage image payload rejected 400
PASS | valid PNG data URL passes validation
PASS | 25 backend integration & schema tests pass (100%)
```

---

## 📦 Distribution Packages

- **Web Store Production Archive**: [`release/snapcap-pro-v1.1.0-chrome-webstore.zip`](release/snapcap-pro-v1.1.0-chrome-webstore.zip)
- **Root Mirror**: [`snapcap-pro-v1.1.0-chrome-webstore.zip`](snapcap-pro-v1.1.0-chrome-webstore.zip)
- **Unpacked Directory for Developer Testing**: `dist/`
