// Ring Ring Run lobby + relay server. No dependencies: just `node server.js`.
// Everyone opens http://<this-computer's-address>:3000 in a browser.
// The KING's browser runs the game; this server only hosts the lobby and passes messages around.
const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = +process.env.PORT || 3000;
const HPORT = +process.env.HTTPS_PORT || PORT + 1;   // https twin: phones only allow the microphone on https
const ROLES = ['king', 'archer', 'thief'];
const clients = new Map(); // id -> {id,name,role,res}
let started = false;
let nextId = 1;

function addrs() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces()))
    for (const i of list || []) if ((i.family === 'IPv4' || i.family === 4) && !i.internal) out.push(`http://${i.address}:${PORT}`);
  // wifi / hotspot ranges first
  const rank = u => /\/\/192\.168\./.test(u) ? 0 : /\/\/10\./.test(u) ? 1 : /\/\/172\.(1[6-9]|2\d|3[01])\./.test(u) ? 2 : 3;
  out.sort((a, b) => rank(a) - rank(b));
  return out;
}
// the address the QR code points at. Set PUBLIC_URL (e.g. an ngrok / cloudflared link) to override.
let TLS = null;
try { if (!process.env.NO_HTTPS) TLS = { key: fs.readFileSync(path.join(__dirname, 'key.pem')), cert: fs.readFileSync(path.join(__dirname, 'cert.pem')) }; } catch (e) {}
function httpsAddrs() { return TLS ? addrs().map(u => u.replace('http:', 'https:').replace(':' + PORT, ':' + HPORT)) : []; }
function joinUrl() { return process.env.PUBLIC_URL || addrs()[0] || `http://localhost:${PORT}`; }
let QR = null;
try { QR = require('./qrcode.js'); } catch (e) {}
function terminalQR(text) {
  if (!QR) return '';
  const q = QR(0, 'M'); q.addData(text); q.make();
  const n = q.getModuleCount(), m = 2, dark = (r, c) => r >= 0 && c >= 0 && r < n && c < n && q.isDark(r, c);
  let out = '';
  for (let r = -m; r < n + m; r += 2) {          // two rows per text line; bright blocks = light modules (right polarity on a dark terminal)
    let line = '  ';
    for (let c = -m; c < n + m; c++) {
      const top = !dark(r, c), bot = !dark(r + 1, c);
      line += top && bot ? '█' : top ? '▀' : bot ? '▄' : ' ';
    }
    out += line + '\n';
  }
  return out;
}
function send(c, msg) {
  try { c.res.write('data: ' + JSON.stringify(msg) + '\n\n'); } catch (e) {}
}
function lobbyFor(c) {
  return {
    t: 'lobby', you: c.id, started, addrs: addrs(), url: joinUrl(),
    players: [...clients.values()].map(o => ({ id: o.id, name: o.name, role: o.role })),
  };
}
function broadcastLobby() { for (const c of clients.values()) send(c, lobbyFor(c)); }
function king() { return [...clients.values()].find(c => c.role === 'king'); }

function handle(c, m) {
  if (m.t === 'role') {
    if (started) return;
    if (m.role === null || m.role === '') c.role = null;
    else if (ROLES.includes(m.role) && ![...clients.values()].some(o => o !== c && o.role === m.role)) c.role = m.role;
    return broadcastLobby();
  }
  if (m.t === 'start') {
    const blind = [...clients.values()].filter(o => o.role && o.role !== 'king').length;
    if (c.role === 'king' && blind >= 1 && !started) {
      started = true;
      const players = [...clients.values()].filter(o => o.role).map(o => ({ id: o.id, role: o.role, name: o.name }));
      for (const o of clients.values()) send(o, { t: 'start', players });
    }
    return;
  }
  if (m.t === 'vc') {   // voice-chat signalling: pass straight to one named person (works in the lobby too)
    const o = clients.get(m.to);
    if (o) send(o, Object.assign({}, m, { from: c.id }));
    return;
  }
  if (!started) return;
  const k = king();
  if (!k) return;
  if (c === k) { for (const o of clients.values()) if (o !== c) send(o, m); }   // host -> everyone else
  else send(k, Object.assign({}, m, { from: c.id, role: c.role }));              // anyone else -> host only
}

function drop(c) {
  if (!clients.has(c.id)) return;
  clients.delete(c.id);
  if (started && c.role === 'king') {
    started = false;
    for (const o of clients.values()) { o.role = null; send(o, { t: 'hostleft' }); }
  }
  if (clients.size === 0) started = false;
  broadcastLobby();
}

function app(req, res) {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/' || url.pathname === '/index.html') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
      if (err) { res.writeHead(500); return res.end('index.html missing next to server.js'); }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  } else if (url.pathname === '/qrcode.js') {
    fs.readFile(path.join(__dirname, 'qrcode.js'), (err, data) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(data);
    });
  } else if (url.pathname === '/info') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ url: joinUrl(), addrs: addrs() }));
  } else if (url.pathname === '/join') {
    const id = 'p' + nextId++;
    const name = (url.searchParams.get('name') || 'Player').slice(0, 14);
    clients.set(id, { id, name, role: null, res: null });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id }));
  } else if (url.pathname === '/events') {
    const c = clients.get(url.searchParams.get('id'));
    if (!c) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write('retry: 2000\n\n');
    c.res = res;
    const ka = setInterval(() => { try { res.write(': ka\n\n'); } catch (e) {} }, 15000);
    req.on('close', () => { clearInterval(ka); drop(c); });
    broadcastLobby();
  } else if (url.pathname === '/msg' && req.method === 'POST') {
    const c = clients.get(url.searchParams.get('id'));
    let body = '';
    req.on('data', d => { body += d; if (body.length > 200000) req.destroy(); });
    req.on('end', () => {
      res.writeHead(204); res.end();
      if (!c) return;
      let m; try { m = JSON.parse(body); } catch (e) { return; }
      handle(c, m);
    });
  } else { res.writeHead(404); res.end('not found'); }
}
const server = http.createServer(app);
if (TLS) https.createServer(TLS, app).listen(HPORT, '0.0.0.0');
server.listen(PORT, '0.0.0.0', () => {
  const u = joinUrl();
  console.log('\n  RING RING RUN is live.\n');
  console.log('  You (king), on this computer:  http://localhost:' + PORT);
  console.log('  Jury / friends, same wifi:     ' + u + '   (QR points here; plain http, most reliable)');
  if (TLS && !process.env.PUBLIC_URL) console.log('  Phone voice chat (optional):   ' + httpsAddrs()[0] + '   (certificate warning: Advanced > Proceed)');
  const others = addrs().filter(a => a !== u);
  if (others.length) console.log('  (other addresses: ' + others.join(', ') + ')');
  console.log('\n  Scan to join and play:\n');
  console.log(terminalQR(u));
  console.log('  The same QR is on the lobby screen. Everyone must be on the same wifi / hotspot.');
  console.log('  Wifi blocks device-to-device traffic? Use your phone hotspot, or run a tunnel and start with PUBLIC_URL=https://your-link node server.js\n');
  if (!process.env.NO_OPEN) {
    const { exec } = require('child_process');
    const target = 'http://localhost:' + PORT, cmd = process.platform === 'win32' ? `start "" "${target}"` : process.platform === 'darwin' ? `open "${target}"` : `xdg-open "${target}"`;
    exec(cmd, () => {});
  }
});
