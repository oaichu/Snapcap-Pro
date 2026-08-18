# 🚀 SnapCap - Open-Source Screenshot & 30s Screen Recorder Extension

> An ultra-lightweight, high-performance, open-source Chrome extension for full-page screenshot capture, cropped region selection, and quick 30-second screen video recording.

![SnapCap Banner](icons/icon128.png)

## ⚖️ Legal & Compliance

For information about licensing, privacy, and commercial use:

- **License**: [MIT License](/LICENSE) - Free for commercial and personal use
- **Privacy Policy**: [/legal/PRIVACY_POLICY.md](/legal/PRIVACY_POLICY.md)
- **Terms of Service**: [/legal/TERMS_OF_SERVICE.md](/legal/TERMS_OF_SERVICE.md)
- **Cookie Policy**: [/legal/COOKIE_POLICY.md](/legal/COOKIE_POLICY.md)
- **Security Policy**: [/SECURITY.md](/SECURITY.md)
- **Third-Party Attribution**: [/ATTRIBUTION.md](/ATTRIBUTION.md)
- **Compliance Status**: [/COMPLIANCE_STATUS.md](/COMPLIANCE_STATUS.md)

**Commercial Use**: ✅ This software is licensed under the MIT License, which permits commercial use, modification, and distribution. See [COMMERCIAL_COMPLIANCE_CHECKLIST.md](/legal/COMMERCIAL_COMPLIANCE_CHECKLIST.md) for deployment requirements.

---

## ✨ Why SnapCap?

Existing web store extensions are often bloated, closed-source, or lock essential features behind paywalls. **SnapCap** is built with modern **Manifest V3**, **Vanilla JS**, and **HTML5 Canvas**, delivering a 60fps smooth experience with **zero external npm dependencies** and a total size under **1MB**.

---

## 🌟 Key Features

### 📸 Screenshot Tools

- **Visible Area Capture**: Instant 1-click snapshot of your active browser window.
- **Crop Region Selection**: Interactive drag-and-drop crop box with live pixel dimension badge.
- **Full Page Auto-Scroll**: Automatically scrolls down long web pages and stitches snapshots into a pixel-perfect image.
- **Delay Timer**: Configurable 3s/5s countdown timer before capturing.

### 🎥 30-Second Screen Recorder

- **Short Clip Recording**: Max 30s timer designed specifically for fast bug reporting, demo clips, and social shares.
- **Microphone & Audio Support**: Toggle mic input alongside system/tab audio.
- **Live In-Page Badge**: Floating status badge with real-time countdown timer (`🔴 Rec 00:24 / 00:30`) and Stop button.
- **Video Frame Extraction**: Single-click to capture any video frame directly into the Image Editor for instant annotation!

### 🎨 Studio Annotation Suite

- **Draw / Pencil**: Freehand smooth drawing with customizable stroke sizes.
- **Shapes**: Vector arrows (`↗️`), Rectangles (`🔲`), Circles (`⭕`).
- **Typography**: Add custom text overlays directly on screenshots.
- **Privacy Redaction / Blur (`🌫️`)**: Pixelate sensitive details (passwords, secret keys, emails) before sharing.
- **Color Palette**: Preset vibrant neon colors + custom Hex color picker.
- **Undo / Redo History**: Full multi-step undo/redo stack.
- **Instant Export**: Download as high-res **PNG** / **WebM** or **Copy to Clipboard** with 1 click.

---

## 📁 Project Structure

```
open-capture-extension/
├── manifest.json            # Chrome Extension Manifest V3
├── icons/                   # App icons (16x16, 48x48, 128x128)
├── popup/
│   ├── popup.html           # Sleek popup dashboard
│   ├── popup.css            # Dark glassmorphism styles
│   └── popup.js             # User trigger handlers & settings
├── content/
│   ├── overlay.css          # In-page crop selection & floating badges
│   └── content_script.js    # Crop tool, full-page scroll & toast notifications
├── background/
│   └── service_worker.js    # Manifest V3 service worker & screenshot stitching
├── offscreen/
│   ├── offscreen.html       # Offscreen container for MediaRecorder API
│   └── offscreen.js         # 30-second MediaRecorder stream recorder & IndexedDB engine
└── editor/
    ├── editor.html          # Full Studio Editor & Video Player UI
    ├── editor.css           # Studio typography & layout
    └── editor.js            # Canvas annotation engine, vector tools & export
```

---

## 📥 Installation Guide (Developer Mode)

You can test and install SnapCap in any Chromium-based browser (Google Chrome, Microsoft Edge, Brave, Opera, Vivaldi) in 3 simple steps:

1. **Clone or Download** this repository:
   ```bash
   git clone https://github.com/your-repo/snapcap-extension.git
   ```
2. Open your browser and navigate to `chrome://extensions` (or `edge://extensions`).
3. Enable **"Developer mode"** in the top-right corner.
4. Click **"Load unpacked"** and select the `open-capture-extension` folder.
5. 🎉 **Done!** Click the extension puzzle icon and pin **SnapCap Studio** to your toolbar.

---

## ⚡ Performance Benchmark

| Metric            | SnapCap                          | Other Extensions |
| :---------------- | :------------------------------- | :--------------- |
| **Package Size**  | **< 800 KB**                     | 15 MB - 50 MB    |
| **RAM Footprint** | **~15 MB** (Service Worker idle) | 120 MB+          |
| **Dependencies**  | **0 (Pure JS/Canvas)**           | 40+ node modules |
| **Open Source**   | **100% MIT License**             | Proprietary      |

---

## 📄 License

Distributed under the **MIT License** (see [LICENSE](LICENSE)).

## 🆓 100% Free for the Community

SnapCap is **completely free for everyone — no paywalls, no locked features.** The "Pro" name is kept purely as a feature label; every feature (full-page capture, screen recording, blur/redaction, cloud sync, priority support) and every generous storage/capture limit is unlocked for all users on the free tier.

- The extension is **offline-first**: screenshots, recording and editing all run locally in your browser, with no account required and no captures or recordings uploaded anywhere.
- An **optional, free backend API** (`backend/`) is provided for those who want cloud sync / storage. It requires a Firebase project (a `serviceAccountKey.json`) and is fully free — no payment integration is needed.

### 🔒 Privacy note

The extension UI (`popup.html`, `editor.html`) makes **zero external network requests**: it renders
with the operating system's native font stack, so no web font (and no CDN) is contacted. The
manifest CSP no longer allow-lists any font host. **No screenshots, recordings or user content ever
leave your device** unless you explicitly opt in to the cloud sync backend.

> Resolved in v1.1.0: the Google Fonts (Inter) CDN dependency was removed entirely.

See [RELEASE_NOTES.md](RELEASE_NOTES.md) for the v1.1.0 release summary.
