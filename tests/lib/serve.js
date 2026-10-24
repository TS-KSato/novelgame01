// 試験用の静的サーバー。リポジトリの直下を配信する（外部パッケージを使わない）。
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
};

function serve(root, port) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let p = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
    if (!p.startsWith(root)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
    if (!fs.existsSync(p)) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

module.exports = { serve };

if (require.main === module) {
  const port = Number(process.argv[2] || 8080);
  serve(path.join(__dirname, '..', '..'), port).then(() => console.log('http://127.0.0.1:' + port + '/'));
}
