import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import rootRoutes from './src/server/routes/index.js';

const app = express();
const PORT = parseInt(process.env.SERVER_PORT || '3000', 10);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Routes
app.use('/api', rootRoutes);

// ==========================================
// VITE DEV SERVER AND PRODUCTION SERVING
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MiniLLM Gateway server bootstrapped on http://0.0.0.0:${PORT}`);
    console.log('--- Environment Variables ---');
    console.log(`GOOGLE_GENAI_USE_ENTERPRISE: ${process.env.GOOGLE_GENAI_USE_ENTERPRISE}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`SERVER_PORT: ${process.env.SERVER_PORT}`);
    console.log('-----------------------------');
  });
}

startServer();

