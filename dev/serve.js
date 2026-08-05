/* ─────────────────────────────────────────
   LOCAL PREVIEW SERVER (dev only)
   Serves the site on localhost and plugs the
   style dial kit (dev/dial-kit.js) into every
   HTML page — click a line, then pick one of
   the design-system .b-* styles from the
   top-right dropdown.

   Run:  node dev/serve.js     → http://localhost:8931
   Stop: Ctrl+C

   dev/ is excluded from the Vercel deploy
   (.vercelignore), so none of this ships.
───────────────────────────────────────── */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 8931;
const INJECT = '<script src="/dev/dial-kit.js"></script>';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.md': 'text/markdown; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);

  // Keep requests inside the repo.
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }

  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found: ' + urlPath); return; }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    if (ext === '.html') {
      data = data.toString('utf8').replace(/<\/body>/i, INJECT + '\n</body>');
    }
    res.end(data);
  });
}).listen(PORT, () => {
  console.log('\n  pf35 local preview — style dial kit plugged in');
  console.log('  → http://localhost:' + PORT + '\n');
  console.log('  The "Dial kit" pill sits top-right on every page (dev only).');
  console.log('  Click it, click a line, pick a .b-* style. Ctrl+C to stop.\n');
}).on('error', e => {
  if (e.code === 'EADDRINUSE') {
    console.error('Port ' + PORT + ' is busy — already running? Otherwise: PORT=4000 node dev/serve.js');
    process.exit(1);
  }
  throw e;
});
