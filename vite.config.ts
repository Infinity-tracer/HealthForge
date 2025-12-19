import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project structure
const clientRoot = path.resolve(__dirname, 'client');
const clientSrc = path.resolve(clientRoot, 'src');
const clientPublic = path.resolve(clientRoot, 'public');
const outDir = path.resolve(__dirname, 'dist');

// Safety checks (optional logs)
if (!fs.existsSync(clientRoot)) console.warn('WARNING: client/ folder missing.');
if (!fs.existsSync(clientSrc)) console.warn('WARNING: client/src/ missing.');

export default defineConfig({
  root: clientRoot,

  plugins: [react()],

  resolve: {
    alias: {
      '@': clientSrc,
      '@shared': path.resolve(__dirname, 'shared'),  // FIX for @shared/schema
    },
  },

  publicDir: clientPublic,

  build: {
    outDir,
    emptyOutDir: true,
  },

  server: {
    strictPort: true,
    port: 5173, // Vite only, backend still serves on 5000
  },
});
