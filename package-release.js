import { existsSync, mkdirSync, readFileSync, statSync, copyFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const rootDir = resolve(process.cwd());
const distDir = resolve(rootDir, 'dist');
const manifestPath = resolve(distDir, 'manifest.json');

if (!existsSync(manifestPath)) {
  console.error('Error: dist/manifest.json not found! Run "npm run build" first.');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const version = manifest.version || '1.0.0';
const releaseDir = resolve(rootDir, 'release');
if (!existsSync(releaseDir)) mkdirSync(releaseDir, { recursive: true });

const webstoreZipFilename = `snapcap-pro-v${version}-chrome-webstore.zip`;
const standardZipFilename = `snapcap-pro-v${version}.zip`;
const crxFilename = `snapcap-pro-v${version}.crx`;

const webstoreZipPath = resolve(releaseDir, webstoreZipFilename);
const standardZipPath = resolve(releaseDir, standardZipFilename);
const crxPath = resolve(releaseDir, crxFilename);
const rootZipPath = resolve(rootDir, webstoreZipFilename);

console.log(`Packaging SnapCap Pro v${version}...`);

// Verify required files in dist
const requiredFiles = [
  'manifest.json',
  'background/service_worker.js',
  'content/content_script.js',
  'content/overlay.css',
  'popup/popup.html',
  'popup/popup.js',
  'popup/popup.css',
  'editor/editor.html',
  'editor/editor.js',
  'editor/editor.css',
  'offscreen/offscreen.html',
  'offscreen/offscreen.js',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png',
];

const missing = requiredFiles.filter(f => !existsSync(resolve(distDir, f)));
if (missing.length > 0) {
  console.error('Missing required files in dist/:', missing);
  process.exit(1);
}

// Check on OS and create zip
const isWin = process.platform === 'win32';
try {
  if (isWin) {
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${webstoreZipPath}' -Force"`,
      { stdio: 'inherit' }
    );
    execSync(
      `powershell -NoProfile -Command "Copy-Item -Path '${webstoreZipPath}' -Destination '${standardZipPath}' -Force"`,
      { stdio: 'inherit' }
    );
    execSync(
      `powershell -NoProfile -Command "Copy-Item -Path '${webstoreZipPath}' -Destination '${rootZipPath}' -Force"`,
      { stdio: 'inherit' }
    );
  } else {
    execSync(`cd "${distDir}" && zip -r "${webstoreZipPath}" . -x "*.DS_Store"`, { stdio: 'inherit' });
    execSync(`cp "${webstoreZipPath}" "${standardZipPath}"`, { stdio: 'inherit' });
    execSync(`cp "${webstoreZipPath}" "${rootZipPath}"`, { stdio: 'inherit' });
  }

  // Attempt to build .crx single file package if Chrome or Edge is present
  const chromeCandidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ];

  let chromeExe = chromeCandidates.find(p => existsSync(p));
  const keyPath = resolve(rootDir, 'snapcap-pro-key.pem');

  if (chromeExe) {
    try {
      const keyArg = existsSync(keyPath) ? ` --pack-extension-key="${keyPath}"` : '';
      const tempUserData = resolve(rootDir, '.temp-chrome-pack');
      execSync(`"${chromeExe}" --pack-extension="${distDir}"${keyArg} --user-data-dir="${tempUserData}"`, { stdio: 'ignore' });
      
      const generatedCrx = resolve(rootDir, 'dist.crx');
      const generatedPem = resolve(rootDir, 'dist.pem');
      
      if (existsSync(generatedPem) && !existsSync(keyPath)) {
        copyFileSync(generatedPem, keyPath);
      }
      
      if (existsSync(generatedCrx)) {
        copyFileSync(generatedCrx, crxPath);
      }
    } catch (e) {
      console.warn('CRX packaging warning (skipping):', e.message);
    }
  }

  const zipStats = statSync(standardZipPath);
  console.log(`\n======================================================`);
  console.log(` SUCCESS: Release Packages Created!`);
  console.log(` Standard ZIP package   : ${standardZipPath} (${(zipStats.size / 1024).toFixed(2)} KB)`);
  console.log(` Chrome Web Store ZIP   : ${webstoreZipPath}`);
  if (existsSync(crxPath)) {
    const crxStats = statSync(crxPath);
    console.log(` Single CRX extension   : ${crxPath} (${(crxStats.size / 1024).toFixed(2)} KB)`);
  }
  console.log(` Manifest version       : ${version}`);
  console.log(`======================================================\n`);
} catch (err) {
  console.error('Failed to create package:', err);
  process.exit(1);
}

