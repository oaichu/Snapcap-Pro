import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';

const apiBaseUrl = process.env.API_BASE_URL || '';

// A production artifact must never carry a localhost endpoint (the manifest CSP
// does not allow one either). Fail the build instead of shipping it.
if (process.env.NODE_ENV === 'production' && /localhost|127\.0\.0\.1/i.test(apiBaseUrl)) {
  throw new Error(`Production build refused: API_BASE_URL points at localhost (${apiBaseUrl}).`);
}

export default defineConfig({
  root: '.',
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        pure_funcs: ['console.log'],
        drop_debugger: true,
      },
    },
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup/popup.html'),
        editor: resolve(__dirname, 'editor/editor.html'),
        offscreen: resolve(__dirname, 'offscreen/offscreen.html'),
      },
      output: {
        entryFileNames: '[name]/[name].js',
        chunkFileNames: '[name]/[name].js',
        assetFileNames: assetInfo => {
          const name = assetInfo.name || '';
          if (name.endsWith('.css')) return '[name]/[name].css';
          return '[name]/[name].[ext]';
        },
      },
    },
    target: 'chrome88',
  },
  define: {
    // No localhost default: the shipped manifest CSP no longer allows it, and a
    // production bundle must never contain a localhost endpoint. Point a local
    // backend at the build explicitly with API_BASE_URL=... npm run build.
    'process.env.API_BASE_URL': JSON.stringify(apiBaseUrl),
    'process.env.EXTENSION_ID': JSON.stringify(process.env.EXTENSION_ID || ''),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  plugins: [
    {
      name: 'copy-static-assets',
      closeBundle() {
        const staticFiles = [
          { src: 'manifest.json', dest: 'dist/manifest.json' },
          { src: 'icons', dest: 'dist/icons' },
          { src: 'background', dest: 'dist/background' },
          { src: 'content/overlay.css', dest: 'dist/content/overlay.css' },
          { src: 'content/content_script.js', dest: 'dist/content/content_script.js' },
          { src: 'popup/popup.css', dest: 'dist/popup/popup.css' },
          { src: 'editor/editor.css', dest: 'dist/editor/editor.css' },
          { src: 'offscreen/offscreen.html', dest: 'dist/offscreen/offscreen.html' },
        ];

        for (const file of staticFiles) {
          if (existsSync(file.src)) {
            if (file.src.endsWith('/') || existsSync(file.src + '/')) {
              copyDir(file.src, file.dest);
            } else {
              const destDir = resolve(__dirname, file.dest).replace(/[^/]+$/, '');
              if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
              copyFileSync(resolve(__dirname, file.src), resolve(__dirname, file.dest));
            }
          }
        }
      },
    },
  ],
});

function copyDir(src, dest) {
  const srcPath = resolve(__dirname, src);
  const destPath = resolve(__dirname, dest);

  if (!existsSync(destPath)) mkdirSync(destPath, { recursive: true });

  for (const file of readdirSync(srcPath)) {
    const srcFile = resolve(srcPath, file);
    const destFile = resolve(destPath, file);
    if (statSync(srcFile).isDirectory()) {
      copyDir(srcFile, destFile);
    } else {
      copyFileSync(srcFile, destFile);
    }
  }
}
