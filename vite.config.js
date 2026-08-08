import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';

export default defineConfig({
  root: '.',
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
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
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || '';
          if (name.endsWith('.css')) return '[name]/[name].css';
          return '[name]/[name].[ext]';
        }
      }
    },
    target: 'chrome88'
  },
  define: {
    'process.env.API_BASE_URL': JSON.stringify(process.env.API_BASE_URL || 'http://localhost:3000/api'),
    'process.env.EXTENSION_ID': JSON.stringify(process.env.EXTENSION_ID || ''),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
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
      }
    }
  ]
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