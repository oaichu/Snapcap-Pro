import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const rootDir = resolve(process.cwd());
const iconsDir = resolve(rootDir, 'icons');
const assetsDir = resolve(rootDir, 'assets');
const distIconsDir = resolve(rootDir, 'dist/icons');

if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true });
if (!existsSync(assetsDir)) mkdirSync(assetsDir, { recursive: true });
if (!existsSync(distIconsDir)) mkdirSync(distIconsDir, { recursive: true });

// -----------------------------------------------------------------------------
// 1. MASTER STANDALONE VECTOR LOGO SVG (512x512) - High-Velocity Creator Studio Glyph
// No outer bounding box, no white border, pure transparent 32-bit background.
// -----------------------------------------------------------------------------
const masterLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- SnapCap Electric Cyan to Cobalt Blue Gradient -->
    <linearGradient id="snapGradTop" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00F5FF"/>
      <stop offset="35%" stop-color="#0066FF"/>
      <stop offset="85%" stop-color="#7000FF"/>
      <stop offset="100%" stop-color="#8B00FF"/>
    </linearGradient>

    <!-- SnapCap Neon Violet to Laser Magenta Gradient -->
    <linearGradient id="snapGradBottom" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7000FF"/>
      <stop offset="45%" stop-color="#FF007A"/>
      <stop offset="85%" stop-color="#FF3366"/>
      <stop offset="100%" stop-color="#FF6B00"/>
    </linearGradient>

    <!-- Center Play/Iris Core Accent -->
    <linearGradient id="snapPlayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#E0F7FF"/>
    </linearGradient>

    <!-- 3D Specular Sheen (Glossy Highlight) -->
    <linearGradient id="sheenTop" x1="0%" y1="0%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="rgba(255, 255, 255, 0.85)"/>
      <stop offset="40%" stop-color="rgba(255, 255, 255, 0.25)"/>
      <stop offset="100%" stop-color="rgba(255, 255, 255, 0)"/>
    </linearGradient>

    <!-- Intense Neon Aura Filters -->
    <filter id="neonBloom" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="22" result="blur1"/>
      <feGaussianBlur stdDeviation="10" result="blur2"/>
      <feMerge>
        <feMergeNode in="blur1"/>
        <feMergeNode in="blur2"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <filter id="subtleDropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#0066FF" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- High-Energy Freestanding Monogram "S" & Play Velocity Blades -->
  <g filter="url(#subtleDropShadow)" transform="translate(0, 0)">
    
    <!-- Outer Neon Ambient Aura -->
    <g opacity="0.4" filter="url(#neonBloom)">
      <!-- Top Wing Outline -->
      <path d="M 120 180 C 120 110 175 60 256 60 L 360 60 C 395 60 415 90 405 125 C 395 155 365 175 330 175 L 235 175 C 190 175 170 200 160 230 L 320 230 C 385 230 425 275 405 340 L 260 340 Z" fill="url(#snapGradTop)"/>
      <!-- Bottom Wing Outline -->
      <path d="M 392 332 C 392 402 337 452 256 452 L 152 452 C 117 452 97 422 107 387 C 117 357 147 337 182 337 L 277 337 C 322 337 342 312 352 282 L 192 282 C 127 282 87 237 107 172 L 252 172 Z" fill="url(#snapGradBottom)"/>
    </g>

    <!-- 1. Top Dynamic Aerodynamic Ribbon (Loop 1 of S) -->
    <path d="M 120 175 C 120 105 175 56 256 56 L 364 56 C 398 56 418 86 408 120 C 398 152 368 172 332 172 L 232 172 C 185 172 165 198 155 230 L 330 230 C 395 230 435 278 412 345 L 255 345 L 120 175 Z" 
          fill="url(#snapGradTop)"/>

    <!-- Specular Highlight Arc on Top Ribbon -->
    <path d="M 132 165 C 132 110 180 68 256 68 L 360 68 C 385 68 398 86 392 110 C 380 92 350 82 320 82 L 240 82 C 180 82 145 115 132 165 Z" 
          fill="url(#sheenTop)"/>

    <!-- 2. Bottom Dynamic Aerodynamic Ribbon (Loop 2 of S / Video Speed Slash) -->
    <path d="M 392 337 C 392 407 337 456 256 456 L 148 456 C 114 456 94 426 104 392 C 114 360 144 340 180 340 L 280 340 C 327 340 347 314 357 282 L 182 282 C 117 282 77 234 100 167 L 257 167 L 392 337 Z" 
          fill="url(#snapGradBottom)"/>

    <!-- Specular Highlight on Bottom Ribbon -->
    <path d="M 380 347 C 380 402 332 444 256 444 L 152 444 C 127 444 114 426 120 402 C 132 420 162 430 192 430 L 272 430 C 332 430 367 397 380 347 Z" 
          fill="rgba(255, 255, 255, 0.45)"/>

    <!-- 3. Center Modern Play Button / Optical Shutter Reticle -->
    <g transform="translate(216, 216)">
      <!-- Soft Shadow Behind Play Button -->
      <polygon points="26,14 68,40 26,66" fill="rgba(0, 0, 0, 0.45)"/>
      <!-- Pure Crisp White Play Glyph -->
      <polygon points="24,12 66,40 24,68" fill="url(#snapPlayGrad)" filter="url(#subtleDropShadow)"/>
    </g>

    <!-- 4. Dynamic Speed Spark / Flash Energy Star (Top Right) -->
    <g transform="translate(382, 102) scale(0.9)">
      <circle cx="0" cy="0" r="14" fill="#00F5FF" filter="url(#neonBloom)"/>
      <circle cx="0" cy="0" r="7" fill="#FFFFFF"/>
    </g>

    <!-- 5. Bottom Energy Glow Dot (Bottom Left) -->
    <g transform="translate(130, 410) scale(0.9)">
      <circle cx="0" cy="0" r="12" fill="#FF007A" filter="url(#neonBloom)"/>
      <circle cx="0" cy="0" r="6" fill="#FFFFFF"/>
    </g>

  </g>
</svg>`;

// -----------------------------------------------------------------------------
// 2. HERO BANNER SVG (1280x640) - Clean Dark Creator Studio Hero
// -----------------------------------------------------------------------------
const masterBannerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 640" width="1280" height="640">
  <defs>
    <!-- Deep Obsidian Studio Backdrop -->
    <linearGradient id="bCanvas" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06070c"/>
      <stop offset="50%" stop-color="#0b0e1b"/>
      <stop offset="100%" stop-color="#040508"/>
    </linearGradient>

    <!-- Neon Light Orbs -->
    <radialGradient id="cyanOrb" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00F5FF" stop-opacity="0.32"/>
      <stop offset="60%" stop-color="#0066FF" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="pinkOrb" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FF007A" stop-opacity="0.28"/>
      <stop offset="60%" stop-color="#7000FF" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>

    <linearGradient id="vTitleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="40%" stop-color="#00F5FF"/>
      <stop offset="75%" stop-color="#9B51E0"/>
      <stop offset="100%" stop-color="#FF007A"/>
    </linearGradient>

    <linearGradient id="badgePill" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00F5FF"/>
      <stop offset="100%" stop-color="#7000FF"/>
    </linearGradient>

    <!-- Glass Card -->
    <linearGradient id="gCard" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(255, 255, 255, 0.07)"/>
      <stop offset="100%" stop-color="rgba(255, 255, 255, 0.02)"/>
    </linearGradient>
    <linearGradient id="gBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(0, 245, 255, 0.35)"/>
      <stop offset="50%" stop-color="rgba(112, 0, 255, 0.25)"/>
      <stop offset="100%" stop-color="rgba(255, 0, 122, 0.2)"/>
    </linearGradient>

    <filter id="bBlur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="40" result="blur"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1280" height="640" fill="url(#bCanvas)"/>

  <!-- Energy Light Orbs -->
  <circle cx="260" cy="240" r="380" fill="url(#cyanOrb)" filter="url(#bBlur)"/>
  <circle cx="1020" cy="380" r="380" fill="url(#pinkOrb)" filter="url(#bBlur)"/>

  <!-- Tech Grid Lines -->
  <g stroke="rgba(255, 255, 255, 0.025)" stroke-width="1">
    <line x1="0" y1="160" x2="1280" y2="160"/>
    <line x1="0" y1="320" x2="1280" y2="320"/>
    <line x1="0" y1="480" x2="1280" y2="480"/>
    <line x1="320" y1="0" x2="320" y2="640"/>
    <line x1="640" y1="0" x2="640" y2="640"/>
    <line x1="960" y1="0" x2="960" y2="640"/>
  </g>

  <!-- Left Side: Freestanding Logo Mark -->
  <g transform="translate(100, 150) scale(0.68)">
    ${masterLogoSvg}
  </g>

  <!-- Right Side: Brand Typography & Feature Matrix -->
  <g transform="translate(490, 165)">
    <!-- Pill Tag -->
    <g transform="translate(0, 0)">
      <rect x="0" y="0" width="240" height="34" rx="17" fill="rgba(0, 245, 255, 0.1)" stroke="url(#badgePill)" stroke-width="1.5"/>
      <circle cx="17" cy="17" r="5" fill="#00FFB2"/>
      <text x="32" y="22" fill="#00F5FF" font-family="-apple-system, 'SF Pro Display', sans-serif" font-size="12" font-weight="800" letter-spacing="1.5">CREATOR STUDIO PRO</text>
    </g>

    <!-- Master Brand Title -->
    <text x="0" y="96" fill="url(#vTitleGrad)" font-family="-apple-system, 'SF Pro Display', 'Inter', sans-serif" font-size="64" font-weight="900" letter-spacing="-2">
      SnapCap <tspan fill="#00F5FF">Pro</tspan>
    </text>

    <!-- Subtitle -->
    <text x="0" y="140" fill="rgba(235, 235, 245, 0.85)" font-family="-apple-system, 'SF Pro Text', sans-serif" font-size="18" font-weight="500" letter-spacing="-0.3">
      The High-Velocity Screenshot &amp; 30s 4K Screen Recorder for Creators
    </text>

    <!-- Feature Grid (4 Creator-Grade Cards) -->
    <g transform="translate(0, 180)">
      <!-- Card 1: Full Page -->
      <g transform="translate(0, 0)">
        <rect width="160" height="54" rx="14" fill="url(#gCard)" stroke="url(#gBorder)" stroke-width="1.2"/>
        <circle cx="28" cy="27" r="11" fill="rgba(0, 245, 255, 0.18)"/>
        <path d="M 23 27 L 27 31 L 33 23" stroke="#00F5FF" stroke-width="2.2" stroke-linecap="round" fill="none"/>
        <text x="48" y="25" fill="#FFFFFF" font-family="-apple-system, sans-serif" font-size="13" font-weight="800">Full Page</text>
        <text x="48" y="40" fill="rgba(255, 255, 255, 0.55)" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">Smart Stitch</text>
      </g>

      <!-- Card 2: Crop -->
      <g transform="translate(172, 0)">
        <rect width="160" height="54" rx="14" fill="url(#gCard)" stroke="url(#gBorder)" stroke-width="1.2"/>
        <circle cx="28" cy="27" r="11" fill="rgba(112, 0, 255, 0.25)"/>
        <rect x="23" y="22" width="10" height="10" rx="2" stroke="#9B51E0" stroke-width="2" fill="none"/>
        <text x="48" y="25" fill="#FFFFFF" font-family="-apple-system, sans-serif" font-size="13" font-weight="800">Crop Area</text>
        <text x="48" y="40" fill="rgba(255, 255, 255, 0.55)" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">Drag &amp; Snap</text>
      </g>

      <!-- Card 3: 30s Recording -->
      <g transform="translate(344, 0)">
        <rect width="160" height="54" rx="14" fill="url(#gCard)" stroke="url(#gBorder)" stroke-width="1.2"/>
        <circle cx="28" cy="27" r="11" fill="rgba(255, 0, 122, 0.2)"/>
        <circle cx="28" cy="27" r="5" fill="#FF007A"/>
        <text x="48" y="25" fill="#FFFFFF" font-family="-apple-system, sans-serif" font-size="13" font-weight="800">30s Studio</text>
        <text x="48" y="40" fill="rgba(255, 255, 255, 0.55)" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">4K WebM Clip</text>
      </g>

      <!-- Card 4: 100% Free -->
      <g transform="translate(516, 0)">
        <rect width="160" height="54" rx="14" fill="url(#gCard)" stroke="url(#gBorder)" stroke-width="1.2"/>
        <circle cx="28" cy="27" r="11" fill="rgba(0, 255, 178, 0.18)"/>
        <path d="M 24 30 L 32 22 M 28 22 L 32 22 L 32 26" stroke="#00FFB2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <text x="48" y="25" fill="#FFFFFF" font-family="-apple-system, sans-serif" font-size="13" font-weight="800">100% Free</text>
        <text x="48" y="40" fill="rgba(255, 255, 255, 0.55)" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">Zero Paywall</text>
      </g>
    </g>

    <!-- Bottom Legend -->
    <g transform="translate(0, 268)">
      <text x="0" y="16" fill="rgba(255, 255, 255, 0.45)" font-family="-apple-system, sans-serif" font-size="12" font-weight="700" letter-spacing="0.8">
        100% OPEN SOURCE • ZERO TELEMETRY • NO SUBSCRIPTION • MIT COMMERCIAL LICENSE
      </text>
    </g>
  </g>
</svg>`;

// Write master SVG files
writeFileSync(resolve(iconsDir, 'logo.svg'), masterLogoSvg, 'utf8');
writeFileSync(resolve(assetsDir, 'snapcap-hero-banner.svg'), masterBannerSvg, 'utf8');
console.log(' Master borderless SnapCap SVG icons written.');

// Render PNGs via Headless Edge/Chrome with transparent background for icons
const renderHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: transparent !important; overflow: hidden; display: flex; align-items: center; justify-content: center; width: 100vw; height: 100vh; }
    img { width: 100%; height: 100%; object-fit: contain; }
  </style>
</head>
<body>
  <img id="logo" src="data:image/svg+xml;base64,${Buffer.from(masterLogoSvg).toString('base64')}" />
</body>
</html>`;

const renderBannerHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #06070c; overflow: hidden; width: 1280px; height: 640px; }
    img { width: 1280px; height: 640px; display: block; }
  </style>
</head>
<body>
  <img src="data:image/svg+xml;base64,${Buffer.from(masterBannerSvg).toString('base64')}" />
</body>
</html>`;

const tempHtmlPath = resolve(rootDir, 'temp_render.html');
const tempBannerHtmlPath = resolve(rootDir, 'temp_banner_render.html');

writeFileSync(tempHtmlPath, renderHtml, 'utf8');
writeFileSync(tempBannerHtmlPath, renderBannerHtml, 'utf8');

const edgeCandidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

let browserPath = null;
for (const p of edgeCandidates) {
  if (existsSync(p)) {
    browserPath = p;
    break;
  }
}

if (!browserPath) {
  console.warn('Could not locate Edge/Chrome executable for screenshot rendering.');
  process.exit(0);
}

console.log('Rendering high-resolution raster icons with:', browserPath);

const iconSizes = [16, 48, 128, 512];

for (const size of iconSizes) {
  const outPng = resolve(iconsDir, `icon${size}.png`);
  const distPng = resolve(distIconsDir, `icon${size}.png`);
  // Use --default-background-color=00000000 for true 32-bit transparent PNG rendering
  const cmd = `"${browserPath}" --headless --disable-gpu --default-background-color=00000000 --hide-scrollbars --window-size=${size},${size} --screenshot="${outPng}" "file:///${tempHtmlPath.replace(/\\/g, '/')}"`;
  execSync(cmd, { stdio: 'ignore' });
  if (existsSync(outPng)) {
    execSync(`copy /Y "${outPng}" "${distPng}"`, { stdio: 'ignore', shell: 'cmd.exe' });
    console.log(`  icon${size}.png rendered (${size}x${size})`);
  }
}

// Render banner PNG
const bannerPng = resolve(assetsDir, 'snapcap-hero-banner.png');
const bannerCmd = `"${browserPath}" --headless --disable-gpu --hide-scrollbars --window-size=1280,640 --screenshot="${bannerPng}" "file:///${tempBannerHtmlPath.replace(/\\/g, '/')}"`;
execSync(bannerCmd, { stdio: 'ignore' });
console.log('  snapcap-hero-banner.png rendered (1280x640)');

// Clean up temp render HTML
try {
  execSync(`del /F /Q "${tempHtmlPath}" "${tempBannerHtmlPath}"`, {
    stdio: 'ignore',
    shell: 'cmd.exe',
  });
} catch (err) {
  /* ignore cleanup failure */
}

console.log('\n All borderless SnapCap brand assets generated successfully!');
