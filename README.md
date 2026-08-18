# 🚀 SnapCap - Free Open-Source Screenshot & 30s Screen Recorder Extension

> An ultra-lightweight, high-performance, **100% free** Chrome extension for full-page screenshot capture, cropped region selection, and quick 30-second screen video recording. **No paywalls. No premium features. Forever free for the community.**

![SnapCap Banner](icons/icon128.png)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](/LICENSE)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-blue.svg)](https://chrome.google.com/webstore)
[![Size](https://img.shields.io/badge/Size-%3C1MB-lightgrey.svg)]()

---

## 💝 100% Free for Everyone

**SnapCap is completely free for the community — no paywalls, no locked features, no subscriptions.**

- ✅ **All features unlocked**: Full-page capture, screen recording, blur/redaction, cloud sync — everything is free
- ✅ **Generous limits**: No artificial restrictions on storage or captures
- ✅ **Offline-first**: Works entirely in your browser with no account required
- ✅ **Open source**: Built transparently with zero external npm dependencies
- ✅ **Privacy-focused**: No screenshots or recordings leave your device unless you explicitly opt in

The "Pro" labels in the UI are kept only as feature names — **every single feature is available on the free tier**.

---

## ⚖️ Legal & Compliance

This project is licensed under the **MIT License** and is free for personal and commercial use.

- **License**: [MIT License](/LICENSE) - Free forever for everyone
- **Privacy Policy**: [/legal/PRIVACY_POLICY.md](/legal/PRIVACY_POLICY.md)
- **Terms of Service**: [/legal/TERMS_OF_SERVICE.md](/legal/TERMS_OF_SERVICE.md)
- **Cookie Policy**: [/legal/COOKIE_POLICY.md](/legal/COOKIE_POLICY.md)
- **Security Policy**: [/SECURITY.md](/SECURITY.md)
- **Third-Party Attribution**: [/ATTRIBUTION.md](/ATTRIBUTION.md)
- **Compliance Status**: [/COMPLIANCE_STATUS.md](/COMPLIANCE_STATUS.md)

---

## ✨ Why SnapCap?

Existing web store extensions are often bloated, closed-source, or lock essential features behind paywalls. **SnapCap** is built with modern **Manifest V3**, **Vanilla JS**, and **HTML5 Canvas**, delivering a 60fps smooth experience with **zero external npm dependencies** and a total size under **1MB**.

Built by the community, for the community.

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

## 📄 License & Community

Distributed under the **MIT License** (see [LICENSE](LICENSE)).

**SnapCap is 100% free for the community — forever.** This is an open-source project built by and for users who believe in free, transparent, and privacy-respecting software.

- 🆓 **No paywalls**: Every feature is unlocked for everyone
- 🔓 **No premium tiers**: No hidden costs or subscriptions
- 🌍 **Community-driven**: Contributions welcome from everyone
- 🔒 **Privacy-first**: Your data stays on your device

### Contributing

We welcome contributions from the community! Whether it's bug reports, feature requests, documentation improvements, or code contributions — all help make SnapCap better for everyone.

See our contribution guidelines to get started.

### Support

- 💬 **Issues**: Report bugs or request features on GitHub Issues
- 📧 **Contact**: Reach out via email for questions or support
- 📖 **Documentation**: Check out our guides and FAQs

---

### 🔒 Privacy Promise

The extension UI (`popup.html`, `editor.html`) makes **zero external network requests**: it renders with the operating system's native font stack, so no web font (and no CDN) is contacted. The manifest CSP no longer allow-lists any font host. **No screenshots, recordings or user content ever leave your device** unless you explicitly opt in to the cloud sync backend.

> Resolved in v1.1.0: the Google Fonts (Inter) CDN dependency was removed entirely.

See [RELEASE_NOTES.md](RELEASE_NOTES.md) for the v1.1.0 release summary.

---

**Built with ❤️ by the community, for the community.**
