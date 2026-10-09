import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const CACHE_CONTROL = {
  '.html': 'no-cache, no-store, must-revalidate',
  '.css': 'no-cache, no-store, must-revalidate',
  '.js': 'no-cache, no-store, must-revalidate',
  '.json': 'no-cache, no-store, must-revalidate',
  '.svg': 'public, max-age=31536000, immutable',
  '.png': 'public, max-age=31536000, immutable',
  '.jpg': 'public, max-age=31536000, immutable',
  '.ico': 'public, max-age=31536000, immutable',
  '.woff': 'public, max-age=31536000, immutable',
  '.woff2': 'public, max-age=31536000, immutable',
};

const server = createServer(async (req, res) => {
  const startTime = Date.now();
  const url = req.url.split('?')[0]; // Remove query string
  let filePath = join(__dirname, url === '/' ? 'index.html' : url);

  // Security: prevent directory traversal
  const resolvedPath = resolve(filePath);
  if (!resolvedPath.startsWith(resolve(__dirname))) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }

  try {
    const stats = await stat(resolvedPath);
    if (!stats.isFile()) throw new Error('Not a file');

    const content = await readFile(resolvedPath);
    const ext = extname(resolvedPath).toLowerCase();
    
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': CACHE_CONTROL[ext] || 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(content);
  } catch {
    // SPA fallback for client-side routing (only for paths without extension)
    if (!url.startsWith('/api') && !extname(url)) {
      try {
        const content = await readFile(join(__dirname, 'index.html'));
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
        });
        res.end(content);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
    }
  } finally {
    const duration = Date.now() - startTime;
    if (duration > 100) {
      console.log(`⚠ Slow request: ${req.method} ${url} - ${duration}ms`);
    }
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Nano Hero running at http://localhost:${PORT}`);
  console.log(`📁 Serving from: ${__dirname}`);
  console.log(`🌐 Open http://localhost:${PORT} in your browser`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});