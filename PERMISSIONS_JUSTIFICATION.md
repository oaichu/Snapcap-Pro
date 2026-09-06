# Chrome Web Store Permissions Justification for SnapCap Pro

This document provides explicit justifications for all permissions declared in SnapCap Pro's `manifest.json`.

## 1. `activeTab`
- **Justification:** Required to capture the visible contents of the currently active tab using `chrome.tabs.captureVisibleTab` when the user clicks the screenshot button.

## 2. `storage`
- **Justification:** Used to save user preferences locally (default image format PNG/JPEG, default capture delay, annotation tool colors) via `chrome.storage.local`.

## 3. `tabCapture` & `desktopCapture`
- **Justification:** Required to initiate video recording streams of the active tab or user-selected window for the 30-second quick clip recorder.

## 4. `offscreen`
- **Justification:** Manifest V3 requires an offscreen document (`offscreen/offscreen.html`) to stitch canvas segments together during full-page scrolling captures and encode WebM video chunks without blocking the main browser thread.

## 5. `downloads`
- **Justification:** Required to save exported screenshots and recorded WebM files directly to the user's local Downloads folder when requested.

## 6. `clipboardWrite`
- **Justification:** Required to copy captured and annotated screenshots directly to the system clipboard for quick pasting into messaging apps and issue trackers.

## 7. `host_permissions: ["<all_urls>"]`
- **Justification:** Needed to allow content scripts to scroll arbitrary web pages during full-page screenshot capture across any website the user chooses to capture. No background data collection or network scraping occurs.
