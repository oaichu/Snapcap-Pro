# SnapCap E2E Tests

This directory contains end-to-end tests for the SnapCap Chrome Extension.

## Prerequisites

- Chrome browser installed
- ChromeDriver or Puppeteer installed
- Extension loaded in developer mode

## Setup

```bash
npm install --save-dev puppeteer
```

## Running Tests

```bash
npm run test:e2e
```

## Test Structure

```
e2e/
├── setup.js          # Test setup and teardown
├── helpers.js        # Test helper functions
├── popup.test.js     # Popup UI tests
├── capture.test.js   # Capture workflow tests
├── editor.test.js    # Editor workflow tests
└── recording.test.js # Recording workflow tests
```

## Test Coverage

### Popup Tests
- [ ] Popup opens on extension icon click
- [ ] All capture buttons are visible
- [ ] Settings are saved correctly
- [ ] Record button shows duration selector

### Capture Tests
- [ ] Visible area capture works
- [ ] Selected region capture works
- [ ] Full page capture works
- [ ] Crop selection can be cancelled
- [ ] Delay timer works correctly

### Editor Tests
- [ ] Editor opens after capture
- [ ] Pencil tool draws correctly
- [ ] Text tool adds text
- [ ] Shape tools work (rect, circle, arrow)
- [ ] Blur tool works
- [ ] Color picker works
- [ ] Stroke size selector works
- [ ] Undo/Redo works
- [ ] Download PNG works
- [ ] Download WebM works
- [ ] Copy to clipboard works

### Recording Tests
- [ ] Recording starts after screen selection
- [ ] Recording badge shows timer
- [ ] Recording stops at max duration
- [ ] Manual stop works
- [ ] Video plays in editor after recording

### Settings Tests
- [ ] Mic toggle saves preference
- [ ] Duration selector saves preference
- [ ] Delay selector saves preference
- [ ] Preferences persist across sessions

## Writing Tests

```javascript
import puppeteer from 'puppeteer';

describe('Popup', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`
      ]
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  test('should open popup', async () => {
    // Test implementation
  });
});
```

## Notes

- Tests should run in a clean Chrome profile
- Each test should start from a known state
- Use `chrome.storage.local.clear()` to reset state
- Mock external dependencies when possible
