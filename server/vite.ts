import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Express } from 'express';

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function setupVite(app: Express) {
  // Absolute, stable paths
  const projectRoot = path.resolve(__dirname, '..');
  const clientRoot = path.resolve(projectRoot, 'client');
  const viteConfigFile = path.resolve(projectRoot, 'vite.config.ts');

  const vite = await createViteServer({
    root: clientRoot,
    configFile: viteConfigFile,
    server: {
      middlewareMode: true,
    },
  });

  // Attach Vite middleware to Express
  app.use(vite.middlewares);
}
