import { existsSync, mkdirSync, readFileSync, statSync } from 'fs';
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

const zipFilename = `snapcap-pro-v${version}-chrome-webstore.zip`;
const zipPath = resolve(releaseDir, zipFilename);
const rootZipPath = resolve(rootDir, zipFilename);

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
      `powershell -NoProfile -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipPath}' -Force"`,
      { stdio: 'inherit' }
    );
    execSync(
      `powershell -NoProfile -Command "Copy-Item -Path '${zipPath}' -Destination '${rootZipPath}' -Force"`,
      { stdio: 'inherit' }
    );
  } else {
    execSync(`cd "${distDir}" && zip -r "${zipPath}" . -x "*.DS_Store"`, { stdio: 'inherit' });
    execSync(`cp "${zipPath}" "${rootZipPath}"`, { stdio: 'inherit' });
  }

  const stats = statSync(zipPath);
  console.log(`\n======================================================`);
  console.log(` SUCCESS: Chrome Web Store Release Package Created!`);
  console.log(` Release folder : ${zipPath}`);
  console.log(` Root mirror    : ${rootZipPath}`);
  console.log(` Size           : ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(` Manifest ver   : ${version}`);
  console.log(`======================================================\n`);
} catch (err) {
  console.error('Failed to create zip package:', err);
  process.exit(1);
}
