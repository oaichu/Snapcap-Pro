#!/bin/bash
# Real Screenshot Capture Script for SnapCap
# Uses Puppeteer to load extension and capture real screenshots

set -e

echo "📸 SnapCap Real Screenshot Capture"
echo "=================================="

EXTENSION_DIR="$(pwd)"
SCREENSHOTS_DIR="webstore-assets/screenshots"
mkdir -p $SCREENSHOTS_DIR

# Check if Puppeteer is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found"
    exit 1
fi

# Install Puppeteer if needed
if [ ! -d "node_modules/puppeteer" ]; then
    echo "📦 Installing Puppeteer..."
    npm install puppeteer
fi

cat > capture-screenshots.js << 'EOF'
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const EXTENSION_PATH = process.cwd();
const SCREENSHOTS_DIR = path.join(process.cwd(), 'webstore-assets', 'screenshots');

async function captureScreenshots() {
    console.log('🚀 Launching Chrome with extension...');
    
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            `--disable-extensions-except=${EXTENSION_PATH}`,
            `--load-extension=${EXTENSION_PATH}`,
            '--window-size=1280,800',
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ],
        defaultViewport: {
            width: 1280,
            height: 800
        }
    });

    try {
        // Wait for extension to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Get extension ID
        const targets = await browser.targets();
        const extensionTarget = targets.find(t => t.type() === 'service_worker');
        const extensionId = extensionTarget ? extensionTarget._targetId.split('.')[0] : null;
        
        console.log(`Extension ID: ${extensionId}`);
        
        // Create screenshots directory
        if (!fs.existsSync('webstore-assets/screenshots')) {
            fs.mkdirSync('webstore-assets/screenshots', { recursive: true });
        }
        
        // 1. Capture Popup
        console.log('📸 Capturing Popup...');
        const popupUrl = `chrome-extension://${extensionId}/popup/popup.html`;
        const popupPage = await browser.newPage();
        await popupPage.setViewport({ width: 400, height: 600 });
        await popupPage.goto(popupUrl);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await popupPage.screenshot({ 
            path: 'webstore-assets/screenshots/real-popup.png',
            fullPage: true 
        });
        await popupPage.close();
        
        // 2. Capture Editor
        console.log('📸 Capturing Editor...');
        const editorUrl = `chrome-extension://${extensionId}/editor/editor.html`;
        const editorPage = await browser.newPage();
        await editorPage.setViewport({ width: 1280, height: 800 });
        await editorPage.goto(editorUrl);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await editorPage.screenshot({ 
            path: 'webstore-assets/screenshots/real-editor.png',
            fullPage: true 
        });
        await editorPage.close();
        
        // 3. Capture a test page with selection overlay
        console.log('📸 Capturing Selection Overlay...');
        const testPage = await browser.newPage();
        await testPage.setViewport({ width: 1280, height: 800 });
        await testPage.goto('https://example.com');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Trigger selection overlay
        await testPage.evaluate(() => {
            chrome.runtime.sendMessage({ action: 'TRIGGER_SELECTION' });
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await testPage.screenshot({ 
            path: 'webstore-assets/screenshots/real-selection.png',
            fullPage: true 
        });
        await testPage.close();
        
        // 4. Capture a page for recording badge
        console.log('📸 Capturing Recording Badge...');
        const recordPage = await browser.newPage();
        await recordPage.setViewport({ width: 1280, height: 800 });
        await recordPage.goto('https://example.com');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await recordPage.evaluate(() => {
            chrome.runtime.sendMessage({ action: 'SHOW_RECORD_BADGE', duration: 30 });
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await recordPage.screenshot({ 
            path: 'webstore-assets/screenshots/real-recording-badge.png',
            fullPage: true 
        });
        await recordPage.close();
        
        console.log('✅ Screenshots captured successfully!');
        console.log(`📁 Saved to: webstore-assets/screenshots/`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await browser.close();
    }
}

captureScreenshots().catch(console.error);
EOF

echo "🎬 Running Puppeteer screenshot capture..."
node capture-screenshots.js

echo "✅ Screenshots captured!"
echo "📁 Check: $SCREENSHOTS_DIR/"
ls -la $SCREENSHOTS_DIR/