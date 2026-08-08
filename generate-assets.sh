#!/bin/bash
# Chrome Web Store Asset Generation Script for SnapCap
# Generates required assets for Chrome Web Store submission

set -e

echo "🎨 SnapCap Chrome Web Store Asset Generator"
echo "=========================================="

EXTENSION_DIR="$(pwd)"
ASSETS_DIR="webstore-assets"
mkdir -p $ASSETS_DIR

echo "📁 Created assets directory: $ASSETS_DIR"

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install imagemagick
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y imagemagick
    else
        echo "❌ Please install ImageMagick manually"
        exit 1
    fi
fi

# Source icon
SOURCE_ICON="icons/icon128.png"

if [ ! -f "$SOURCE_ICON" ]; then
    echo "❌ Source icon not found: $SOURCE_ICON"
    exit 1
fi

echo "🎨 Generating icons..."

# Generate required icon sizes
convert $SOURCE_ICON -resize 16x16 $ASSETS_DIR/icon16.png
convert $SOURCE_ICON -resize 48x48 $ASSETS_DIR/icon48.png
convert $SOURCE_ICON -resize 128x128 $ASSETS_DIR/icon128.png

# Generate promotional images from base design
echo "🖼️  Generating promotional images..."

# 1280x800 - Large promo tile
convert -size 1280x800 xc:'#0f172a' \
    -gravity center \
    -fill '#06b6d4' -font DejaVu-Sans-Bold -pointsize 72 -annotate +0-100 'SnapCap' \
    -fill '#ffffff' -font DejaVu-Sans -pointsize 36 -annotate +0-20 'Screenshot & 30s Recorder' \
    -fill '#6366f1' -font DejaVu-Sans -pointsize 24 -annotate +0+60 'Chrome Extension' \
    $ASSETS_DIR/promo-1280x800.png

# 440x280 - Small promo tile
convert -size 440x280 xc:'#0f172a' \
    -gravity center \
    -fill '#06b6d4' -font DejaVu-Sans-Bold -pointsize 48 -annotate +0-50 'SnapCap' \
    -fill '#ffffff' -font DejaVu-Sans -pointsize 20 -annotate +0+20 'Screenshot & 30s Recorder' \
    $ASSETS_DIR/promo-440x280.png

# 1280x800 - Screenshot 1: Popup UI
convert -size 1280x800 xc:'#0f172a' \
    -gravity center \
    -fill '#06b6d4' -font DejaVu-Sans-Bold -pointsize 48 -annotate +0-200 'Popup Dashboard' \
    -fill '#ffffff' -font DejaVu-Sans -pointsize 24 -annotate +0-100 'Clean, intuitive popup interface' \
    -fill '#6366f1' -font DejaVu-Sans -pointsize 20 -annotate +0+0 'Visible • Region • Full Page' \
    -fill '#10b981' -font DejaVu-Sans -pointsize 20 -annotate +0+50 'Screen Recorder (30s max)' \
    -fill '#f59e0b' -font DejaVu-Sans -pointsize 20 -annotate +0+100 'Delay Timer • Mic Toggle' \
    $ASSETS_DIR/screenshot-1-popup.png

# 1280x800 - Screenshot 2: Selection Tool
convert -size 1280x800 xc:'#0f172a' \
    -gravity center \
    -fill '#06b6d4' -font DejaVu-Sans-Bold -pointsize 48 -annotate +0-200 'Region Selection' \
    -fill '#ffffff' -font DejaVu-Sans -pointsize 24 -annotate +0-100 'Drag to select any region' \
    -fill '#6366f1' -font DejaVu-Sans -pointsize 20 -annotate +0+0 'Live dimension badge' \
    -fill '#10b981' -font DejaVu-Sans -pointsize 20 -annotate +0+50 'Cancel / Capture buttons' \
    -fill '#f59e0b' -font DejaVu-Sans -pointsize 20 -annotate +0+100 'Pixel-perfect precision' \
    $ASSETS_DIR/screenshot-2-selection.png

# 1280x800 - Screenshot 3: Editor
convert -size 1280x800 xc:'#0f172a' \
    -gravity center \
    -fill '#06b6d4' -font DejaVu-Sans-Bold -pointsize 48 -annotate +0-200 'Annotation Editor' \
    -fill '#ffffff' -font DejaVu-Sans -pointsize 24 -annotate +0-100 'Draw, annotate, redact' \
    -fill '#6366f1' -font DejaVu-Sans -pointsize 20 -annotate +0+0 'Pencil • Arrow • Rect • Circle' \
    -fill '#10b981' -font DejaVu-Sans -pointsize 20 -annotate +0+50 'Text • Blur/Redact • Colors' \
    -fill '#f59e0b' -font DejaVu-Sans -pointsize 20 -annotate +0+100 'Undo/Redo • Export PNG/WebM' \
    $ASSETS_DIR/screenshot-3-editor.png

# 1280x800 - Screenshot 4: Recording
convert -size 1280x800 xc:'#0f172a' \
    -gravity center \
    -fill '#ef4444' -font DejaVu-Sans-Bold -pointsize 48 -annotate +0-200 'Screen Recording' \
    -fill '#ffffff' -font DejaVu-Sans -pointsize 24 -annotate +0-100 '30-second screen recorder' \
    -fill '#6366f1' -font DejaVu-Sans -pointsize 20 -annotate +0+0 'System audio + Microphone' \
    -fill '#10b981' -font DejaVu-Sans -pointsize 20 -annotate +0+50 'Live floating badge timer' \
    -fill '#f59e0b' -font DejaVu-Sans -pointsize 20 -annotate +0+100 'Frame extraction to editor' \
    $ASSETS_DIR/screenshot-4-recording.png

# 1280x800 - Screenshot 5: Video Player
convert -size 1280x800 xc:'#0f172a' \
    -gravity center \
    -fill '#ef4444' -font DejaVu-Sans-Bold -pointsize 48 -annotate +0-200 'Video Player & Frame Capture' \
    -fill '#ffffff' -font DejaVu-Sans -pointsize 24 -annotate +0-100 'Play, pause, seek recordings' \
    -fill '#6366f1' -font DejaVu-Sans -pointsize 20 -annotate +0+0 'One-click frame snapshot' \
    -fill '#10b981' -font DejaVu-Sans -pointsize 20 -annotate +0+50 'Send frame to editor' \
    -fill '#f59e0b' -font DejaVu-Sans -pointsize 20 -annotate +0+100 'Download WebM or PNG' \
    $ASSETS_DIR/screenshot-5-video.png

# Create promo video thumbnail (1280x720)
convert -size 1280x720 xc:'#0f172a' \
    -gravity center \
    -fill '#06b6d4' -font DejaVu-Sans-Bold -pointsize 72 -annotate +0-100 'SnapCap' \
    -fill '#ffffff' -font DejaVu-Sans -pointsize 36 -annotate +0-20 'Screenshot & 30s Recorder' \
    -fill '#ef4444' -font DejaVu-Sans -pointsize 24 -annotate +0+60 '▶  Watch Demo' \
    $ASSETS_DIR/video-thumbnail-1280x720.png

# Create README for assets
cat > $ASSETS_DIR/README.md << 'EOF'
# SnapCap Chrome Web Store Assets

## Generated Assets

### Icons (Required)
- `icon16.png` - 16x16
- `icon48.png` - 48x48  
- `icon128.png` - 128x128

### Promotional Images (Required)
- `promo-1280x800.png` - Large promo tile (1280x800)
- `promo-440x280.png` - Small promo tile (440x280)

### Screenshots (Required - min 1, max 5)
- `screenshot-1-popup.png` - Popup dashboard (1280x800)
- `screenshot-2-selection.png` - Region selection (1280x800)
- `screenshot-3-editor.png` - Annotation editor (1280x800)
- `screenshot-4-recording.png` - Screen recording (1280x800)
- `screenshot-5-video.png` - Video player & frame capture (1280x800)

### Video Thumbnail (Optional)
- `video-thumbnail-1280x720.png` - YouTube thumbnail (1280x720)

## Chrome Web Store Requirements

| Asset | Size | Required |
|-------|------|----------|
| Icon 16 | 16x16 | Yes |
| Icon 48 | 48x48 | Yes |
| Icon 128 | 128x128 | Yes |
| Promo Large | 1280x800 | Yes |
| Promo Small | 440x280 | Yes |
| Screenshots | 1280x800 or 640x400 | Min 1, Max 5 |
| Promo Video | YouTube URL | Optional |

## Notes

- All images are PNG format
- Screenshots are 1280x800 (recommended by Google)
- Promo tiles use SnapCap brand colors
- Replace placeholder screenshots with actual extension screenshots
- Run `./generate-real-screenshots.sh` to capture real extension screenshots

## Next Steps

1. Review all generated assets
2. Replace placeholder screenshots with real captures
2. Upload to Chrome Web Store Developer Dashboard
3. Fill in store listing details